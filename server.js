//modules
const
https = require('https'), fs = require('fs'), ini = require('ini'),
server = require('http').createServer((req, res) => {
	if(req.url == '/ping'){
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.end(JSON.stringify({currentPlayers: io.sockets.sockets.size, maxPlayers: config.max_players, status: 'online', message: config.message}));
	}
}),
io = new (require('socket.io').Server)(server, { cors : {origin: 'https://annihilation.drvortex.dev'}});
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
},
log = message => {
	logs.push(message);
	console.log(message);
};

const Config = class {
	constructor(path, format = 'json', assign = true){
		this._path = path;
		this._format = format;
		this._raw = fs.readFileSync(this._path, 'utf-8');
		this._data = {};
		switch(this._format){
			case 'json':
				if(isJSON(this._raw)){
					this._data = JSON.parse(this._raw);
				}else{
					throw new TypeError(`Config failed parsing ${this._path}: not JSON`);
				}
				break;
			case 'ini':
				this._data = ini.parse(this._raw);
				break;
			default:
				this._data = raw;
		}
		if(assign){
			Object.assign(this, this._data);
		}
	}
	write(data){
		fs.writeFileSync(this._path, data, err => {
			throw `Can't write to config file ${this._path}: ${err}`;
		});
	}
	append(data){
		fs.appendFileSync(this._path, data, err => {
			throw `Can't write to config file ${this._path}: ${err}`;
		});
	}
}

const Player = class {
	constructor(playerInfo, socket){
		Object.assign(this, {
			id: playerInfo.id,
			username: playerInfo.username,
			socket: socket
		});
	}
	kick(message){
		this.socket.emit('kick', message);
		this.socket.disconnect(true);
	}
	ban(message){
		this.kick('you have been banned from this server');
	}
	chat(message){
		io.emit('chat', message);
	}
};

//global variables

const logs = [], chat = [], players = new Map();

//load config and settings and things

const config = new Config('./config.ini', 'ini');
const ops = new Config('./ops.json');
const whitelist = new Config('./whitelist.json');
const blacklist = new Config('./blacklist.json');

//Babylon stuff
//const engine = new NullEngine();

//Socket handling
io.use((socket, next) => {
	get('https://annihilation.drvortex.dev/api/user?token=' + socket.handshake.auth.token, res => {
		if(isJSON(res) && !res.includes('ERROR') && res != 'null'){
			let user = JSON.parse(res);

			if(config.whitelist && !whitelist.includes(user.id)){
				next(new Error('Connection refused: you are not whitelisted'));
			}else if(config.blacklist && blacklist.includes(user.id)){
				next(new Error('Connection refused: you are banned from this server'));
			}else if(user.disabled){
				next(new Error('Connection refused: your account is disabled'));
			}else if(io.sockets.sockets.size >= config.max_players && !(ops[user.id] && ops[user.id].bypassLimit)){
				next(new Error('Connection refused: server full'));
			}else{
				players.set(socket.id, {
					socket: socket,
					id: user.id,
					username: user.username,
					oplvl: ops[user.id] ? ops[user.id].level : 0
				}); 
				log(`${user.username} connected with socket id ${socket.id}`);
				next();
			}
		}else{
			next(new Error('Connection refused: invalid token'));
		}
	});
});
io.on('connection', socket => {
	socket.on('disconnect', reason => {
		log(socket.user.username + ' disconnected: ' + reason);
		players.delete(socket.id)
	});
	socket.onAny(type => {
		 log('recieved packet: ' + type);
	});
	socket.on('get-clients', data => {
		let res = [];
		players.forEach(player => {
			res.push({
				socket: player.socket.id,
				id: player.id,
				username: player.username,
				oplvl: player.oplvl
			});
		});
		socket.emit('packet', res);
	});
	socket.on('get-log', data => {
		if(players.get(socket.id).oplvl > 0){
			socket.emit('packet', logs);
		}else{
			socket.emit('packet', 'Forbidden');
		} 
	});
	socket.on('chat', data => {
		log(`[Chat] ${socket.user.username}: ${data}`);
		io.emit('chat', `${socket.user.username}: ${data}`);
	});
});
server.listen(80, e => log('server started'));