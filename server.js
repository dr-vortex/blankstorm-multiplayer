//modules
const server = require('http').createServer(),
io = new (require('socket.io').Server)(server, { cors : {origin: 'https://annihilation.drvortex.dev'}}),
https = require('https');
//BABYLON = require('babylonjs');
//global.XMLHttpRequest = require('xhr2').XMLHttpRequest;
//Object.assign(global, BABYLON);

//global functions

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
},
isJSON = str => {
	try{
		JSON.parse(str);
		return true;
	}catch(err){
		return false;
	}
};

//global variables

const log = [], chat = [], players = {};

//Babylon stuff
//const engine = new NullEngine();

//Socket handling
io.use((socket, next) => {
	get('https://annihilation.drvortex.dev/api/user?token=' + socket.handshake.auth.token, res => {
		if(isJSON(res) && !res.includes('ERROR') && res != 'null'){
			user = JSON.parse(res);
			log.push(`${user.username} (${user.id}) connected with id ${socket.id}`);
			players[socket.id] = socket.user = {socket: socket, id: user.id, username: user.username, oplvl: parseFloat(user.oplvl)};
			next();
		}else{
			next(new Error('Connection refused: invalid token'));
		}
	});
});
io.on('connection', socket => {
	socket.on('ping', data => {
		log.push('recieved ping');
		socket.emit('packet', {clients: io.engine.clientsCount, status: 'online'});
	});
	socket.on('packet', (type, data) => {
		log.push('recieved packet: '+type);
		switch(type){
			case 'get-clients':
				let res = [];
				for(let id in players){
					res.push({
						socket: id,
						id: players[id].id,
						username: players[id].username,
						oplvl: players[id].oplvl
					});
				}
				socket.emit('packet', res);
				break;
			case 'get-log':
				if(socket.user.oplvl > 0){
					socket.emit('packet', log);
				}else{
					socket.emit('packet', 'Forbidden');
				}
				break;
			case 'chat':
				log.push(`[Chat] ${socket.user.username}: ${data}`);
				io.emit('chat',{user: socket.user.username,  content: data});
				break;
			default:
				socket.emit('packet',`"${type}" packet not accepted`);
		}
	});
});
server.listen(80, e => log.push('server started'));