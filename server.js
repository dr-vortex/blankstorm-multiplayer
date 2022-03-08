const express = require('express'), http = require('http');

const app = express(), server = http.Server(app), io = require('socket.io')(server);

let packet = 0;
app
.get('/packets', (req, res) => {
    res.send(`recieved ${packet} packets`);
})
.get('/libraries/jquery.js', (req, res) => {res.sendFile('d:/annihilation-multiplayer/libraries/jquery.js')})
.get('/libraries/socketio.js', (req, res) => {res.sendFile('d:/annihilation-multiplayer/libraries/socketio.js')})
.get('/',(req,res) => {
	res.send(`
		<html>
			<head>
				<link rel=stylesheet href=https://a.drvortex.dev/libraries/styles.css>
			</head>
			<script src=/libraries/jquery.js></script>
			<script src=/libraries/socketio.js></script>
			<body>
				<button></button>
			</body>
		</html>
	`);
})

io.on('connection', socket => {
    socket.emit('packet','client connected');
	console.log('client connected')
    socket.on('packet', (...args) => {
        socket.emit('packet', `packet #${++packet} recieved`);
    });
});
server.listen(80, e=> console.log('server started.'));