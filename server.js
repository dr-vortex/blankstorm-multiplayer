const app = require('express')(),
server = require('http').createServer(app),
io = new (require('socket.io').Server)(server),
https = require('https');

const get = (url, callback) => {
    https.get(url, res => {
        let body = '';
        res.on('data', data => {
            body += data;
        });
        res.on('end', e => {
           callback(body); 
        });
    });
};

let log = [], chat = [], clients = {};

app
.get('/libraries/jquery.js', (req, res) => {res.sendFile('./libraries/jquery.js')})
.get('/libraries/socketio.js', (req, res) => {res.sendFile('./libraries/socketio.js')})
.get('/',(req,res) => {res.sendFile('./index.html')});

io.on('connection', socket => {
    clients[socket.id] = Object.assign(socket,{username:'dummy',uuid:-1,oplvl:-1,authorized: false});
    log.push('client connected with id '+socket.id);
	socket.on('ping', data => {
	    log.push('recieved ping');
	    socket.emit('packet', {clients: io.engine.clientsCount, status: 'online'});
	});
	socket.on('packet', (type, data) => {
	    log.push('recieved packet: '+type);
	    switch(type){
	        case 'get-clients':
	            if(socket.authorized){
	                let res = [];
	                for(let id in clients){
	                    res.push({
	                        socket: id,
	                        username: clients[id].username,
	                        id: clients[id].uuid,
	                        oplvl: clients[id].oplvl,
	                        authorized: clients[id].authoized
	                    });
	                }
	                socket.emit('packet', res);
	                break;
	            }else{
	                socket.emit('packet', 'Not authorized, please send an "auth" packet with your token');
	            }
                break;
            case 'get-log':
                if(socket.authorized && socket.oplvl > 0){
                    socket.emit('packet', log);
                }else{
                    socket.emit('packet', 'Not authorized');
                }
                break;
            case 'auth':
                get('https://annihilation.drvortex.dev/api/user?token='+data, res => {
                    if(res != 'ERROR 404'){
                        user = JSON.parse(res);
                        log.push(`client ${socket.id} authorized as ${user.id} (${user.username})`);
                        Object.assign(clients[socket.id], {uuid: user.id, username: user.username, oplvl: parseFloat(user.oplvl), authorized: true});
                        socket.emit('packet','authorized as '+user.username);
                    }else{
                        socket.emit('packet','authorization failed');
                    }
                });
                break;
            case 'chat':
                log.push(`[Chat] ${socket.username}: ${data}`);
                io.emit('chat',{user: socket.username,  content: data});
                break;
            default:
                socket.emit('packet',`"${type}" packet not accepted`);
	    }
	});
});
server.listen(80, e => log.push('server started'));