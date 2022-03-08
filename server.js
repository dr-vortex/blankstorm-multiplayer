const io = require('socket.io'), express = require('express');

const socket = new Server(3000), app = express();

let packet = 0;
app.get('/', (req, res) => {
    res.send(`recieved ${packet} packets`);
}).listen(80)

io.on('connection', socket => {
    socket.emit('packet','client connected');
    socket.on('packet', (...args) => {
        socket.emit('packet', `packet #${++packet} recieved`);
    });
});