//plugins
Object.prototype.getByString = function(path, seperator){
	return path
	.split(seperator || /[\.\[\]\'\"]/)
	.filter(p => p)
	.reduce((o, p) => o ? o[p] : null, this)
}
Object.prototype.setByString = function (path, value, seperator) {
	return path
	.split(seperator || /[\.\[\]\'\"]/)
	.filter(p => p)
	.reduce((o, p, i) => o[p] = path.split(seperator || /[\.\[\]\'\"]/).filter(p => p).length === ++i ? value : (o[p] || {}), this);
}


//modules
const
https = require('https'), http = require('http'), fs = require('fs'), ini = require('ini'), 
server = http.createServer((req, res) => {
	if(req.url == '/ping'){
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.end(JSON.stringify({
			currentPlayers: io.sockets.sockets.size,
			maxPlayers: config.max_players,
			message: config.message,
			version: version
		}));
	}
});

//BABYLON = require('babylonjs');
//global.XMLHttpRequest = require('xhr2').XMLHttpRequest;
//Object.assign(global, BABYLON);

//global functions

const get = url => new Promise(resolve => {
	https.get(url, res => {
		let body = '';
		res.on('data', data => {
			body += data;
		});
		res.on('end', e => {
			resolve(body); 
		});
	});
}),
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

const Player = class {
	constructor(info, socket){
		Object.assign(this, {
			id: info.id,
			username: info.username,
			op: ops[info.id] ? ops[info.id].level : 0,
			socket: socket
		});
		players.set(socket.id, this);
	}
	kick(message){
		this.socket.emit('kick', message);
		this.socket.disconnect(true);
	}
	ban(message){
		this.kick(`You have been banned from this server: ${message}`);
		blacklist.push(player.id);
		fs.writeFileSync('./blacklist.json', JSON.stringify(blacklist));
	}
};
const Command = class {
	constructor(run, opRequired){
		this.run = run;
		this.op = opRequired;
	}
};

//global variables

const logs = [], players = new Map();
players.getByID = id => [...players.values()].find(player => player.id == id);
players.getByName = name => [...players.values()].find(player => player.username == name);

const version = 'prototype_4-8';

//load config and settings and things
const config = fs.existsSync('./config.ini') ? ini.parse(fs.readFileSync('./config.ini', 'utf-8')) : {};

const ops = fs.existsSync('./ops.json') ? JSON.parse(fs.readFileSync('./ops.json', 'utf-8')) : {};

const whitelist = fs.existsSync('./whitelist.json') ? JSON.parse(fs.readFileSync('./whitelist.json', 'utf-8')) : {};

const blacklist = fs.existsSync('./blacklist.json') ? JSON.parse(fs.readFileSync('./blacklist.json', 'utf-8')) : {};

//commands

const commands = {
	kick: new Command((player, reason) => {
		players.getByName(player).kick(reason);
		log(executor.username);
		log(`${executor.username} kicked ${player}. Reason: ${reason}`);
		executor.socket.emit('chat', 'Kicked ' + player);
	}, 3),
	ban: new Command((player, reason) => {
		players.getByName(player).ban(reason);
		log(`${executor.username} banned ${player}. Reason: ${reason}`);
		executor.socket.emit('chat', 'Banned ' + player);
	}, 4)
};
const runCommand = (command, player) => {
	try {
		let executor = player;
		log(executor.username);
		let parsed = command.split(' '),
		hasRun = false,
		result = parsed.filter(p => p).reduce((o, p, i) => o?.[p] instanceof Command && player.op >= o?.[p].op ? (hasRun = true, o?.[p].run(...parsed.slice(i + 1))) : o?.[p] instanceof Command ? new Error('You don\'t have permission to run this command') : hasRun ? o : o?.[p] ? o?.[p] : new ReferenceError('Command does not exist'), commands) ?? '';
		player.socket.emit('chat', result);
	} catch (err) {
		player.socket.emit('chat', `Command "${command}" failed: ${err}`);
	}
};


//Babylon stuff
//const engine = new NullEngine();

//Socket handling
const io = new (require('socket.io').Server)(server, { cors : {origin: config.allow_from_all ? '*' : 'https://annihilation.drvortex.dev'}});
io.use((socket, next) => {
	get('https://annihilation.drvortex.dev/api/user?token=' + socket.handshake.auth.token).then(res => {
		if(isJSON(res) && !res.includes('ERROR') && res != 'null'){
		
			let user = JSON.parse(res);
	
			if(config.whitelist && !whitelist.includes(user.id)){
				next(new Error('Connection refused: you are not whitelisted'));
			}else if(config.blacklist && blacklist.includes(user.id)){
				next(new Error('Connection refused: you are banned from this server'));
			}else if(+user.disabled){
				next(new Error('Connection refused: your account is disabled'));
			}else if(io.sockets.sockets.size >= config.max_players && !(ops[user.id] && ops[user.id].bypassLimit)){
				next(new Error('Connection refused: server full'));
			}else{
				let player = new Player(user, socket);
				log(`${user.username} connected with socket id ${socket.id}`);
				io.emit('chat', `${user.username} joined`);
				next();
			}
		}else{
			next(new Error('Connection refused: invalid token'));
		}
	});
});
io.on('connection', socket => {
	let player = players.get(socket.id);
	socket.on('disconnect', reason => {
		let message = 
		reason == 'server namespace disconnect' ? 'Disconnected by server' :
		reason == 'client namespace disconnect' ? 'Client disconnected' :
		reason == 'ping timeout' ? 'Connection timed out' :
		reason == 'transport close' ? 'Lost Connection' :
		reason == 'transport error' ? 'Connection failed' :
		reason;
		log(`${player.username} left (${message})`);
		io.emit('chat', `${player.username} left`);
		players.delete(socket.id);
	});
	socket.on('command', commands => {
		runCommand(commands, player);
		/*
		if(player.op > 0){
			let command = commands.split(' ');
			switch(command[0]){
				case 'kick':
					players.getByName(command[1]).kick(command[2]);
					
					break;
				case 'ban':
					players.getByName(command[1]).ban(command[2]);
					log(`${player.username} banned ${command[1]}. Reason: ${command[2]}`);
					socket.emit('chat', 'Banned ' + command[1]);
					break;
				default:
					socket.emit('chat', 'command does not exist');
			}
		}else{
			socket.emit('chat', `Can't run command: you don't have permission`);
		}*/
	});
	socket.on('chat', data => {
		log(`[Chat] ${player.username}: ${data}`);
		io.emit('chat', `${player.username}: ${data}`);
	});
	if(player.op){
		socket.on('get-log', () => {
			socket.emit('chat', logs);
		});
	}
});
server.listen(80, e => log('server started'));