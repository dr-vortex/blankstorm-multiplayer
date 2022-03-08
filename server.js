const express = require('express'), http = require('http');

const app = express(), server = http.Server(app), io = require('socket.io')(server);

let packet = 0;
app
.get('/packets', (req, res) => {
    res.send(`recieved ${packet} packets`);
})
.get('/libraries/jquery.js', (req, res) => {res.sendFile('./libraries/jquery.js')})
.get('/libraries/socketio.js', (req, res) => {res.sendFile('./libraries/socketio.js')})
.get('/',(req,res) => {res.sendFile('./index.html')})
.get('/ping',(req,res) => {res.send('Server is online.')});

io.on('connection', socket => {
    socket.emit('packet','client connected');
	console.log('client connected');
    socket.on('packet', (...args) => {
        socket.emit('packet', `packet #${++packet} recieved`);
    });
});
server.listen(3000, e=> console.log('server started.'));