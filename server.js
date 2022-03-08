const app = require('express')(),
server = require('http').createServer(app),
io = new (require('socket.io').Server)(server);

let packets = 0, pings = 0, sent = 0, log = [], clients = {};
app
.get('/libraries/jquery.js', (req, res) => {res.sendFile('./libraries/jquery.js')})
.get('/libraries/socketio.js', (req, res) => {res.sendFile('./libraries/socketio.js')})
.get('/libraries/socket.max.js', (req, res) => {res.sendFile('./libraries/socket.max.js')})
.get('/',(req,res) => {res.sendFile('./index.html')})
.get('/broadcast',(req,res) => {res.send('Sent message');io.emit('packet','broadcast');sent++})
.get('/log',(req,res) => {let content = `recieved: ${packets} packets, ${pings} pings<br>sent: ${sent} packets<br><br>Log (${log.length}):<br>`;log.forEach(e=>content += e+'<br>');res.send(content)});

io.on('connection', socket => {
    socket.emit('packet','client connected');
    clients[socket.id] = Object.assign(socket,{username:'dummy',uuid:'-1',oplvl:'-1'});
    sent++;
    log.push('client connected with id '+socket.id);
	socket.on('ping', data => {
	    log.push('recieved: ping');
	    pings++;
	    socket.emit('packet', {clients: io.engine.clientsCount, status: 'online'});
	    sent++;
	});
	socket.on('packet', data => {
	    log.push('recieved: packet');
	    packets++;
	    if(data.auth == 'test-password' && data.content){
	        switch(data.content){
	            case 'get-clients':
	                let res = {};
	                for(let id in clients){
	                    res[id] = {socket:id,username:clients[id].username,id:clients[id].uuid};
	                }
	                socket.emit('packet',res)
	                break;
	        }
	    }else{
	        socket.emit('packet', 'Not Authorized');
	    }
	    sent++;
	});
});
server.listen(80, e => log.push('server started'));