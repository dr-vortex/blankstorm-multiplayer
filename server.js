const io = require('socket.io');

const socket = new Server(3000);

let packet = 0;

io.on('connection', socket => {
    socket.emit('packet','client connected');
    let packet = 0;
    socket.on('packet', (...args) => {
        socket.emit('packet', `packet #${++packet} recieved`);
    });
});