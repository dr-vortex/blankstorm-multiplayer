//plugins
Object.defineProperties(Object.prototype, {
	getByString: {
		value: function(path, seperator){
			return path
			.split(seperator || /[\.\[\]\'\"]/)
			.filter(p => p)
			.reduce((o, p) => o ? o[p] : null, this)
		}
	},
	setByString: {
		value: function(path, value, seperator){
			return path
			.split(seperator || /[\.\[\]\'\"]/)
			.filter(p => p)
			.reduce((o, p, i) => o[p] = path.split(seperator || /[\.\[\]\'\"]/).filter(p => p).length === ++i ? value : (o[p] || {}), this);
		}
	}
});


//modules
const https = require('https'), fs = require('fs'), ini = require('ini');

//pings
const server = require('http').createServer((req, res) => {
	switch(req.url){
		case '/ping':
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.end(JSON.stringify({
				currentPlayers: io.sockets.sockets.size,
				maxPlayers: config.max_players,
				message: config.message,
				version
			}));
		break;
	}
});

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

const API = {
	url: 'https://blankstorm.drvortex.dev/api/',
	user: (name, value) => get(`${API.url}user?${name}=${value}`)
}

//BABYLON = require('babylonjs');
//global.XMLHttpRequest = require('xhr2').XMLHttpRequest;
//Object.assign(global, BABYLON);

const Player = class {
	static getID(name){
		return API.user('username', name).then(info => JSON.parse(info).id);
	}
	sentPackets = 0;
	lastMessager = null;
	constructor(info, socket){
		Object.assign(this, {
			id: info.id,
			username: info.username,
			op: ops[info.id] ? ops[info.id].level : 0,
			socket
		});
		players.set(socket.id, this);
	}
	kick(message){
		this.socket.emit('kick', message);
		this.socket.disconnect(true);
	}
	ban(message){
		this.kick(`You have been banned from this server: ${message}`);
		blacklist.push(this.id);
		fs.writeFileSync('./blacklist.json', JSON.stringify(blacklist));
	}
};
const Command = class {
	#command;
	#op = 0;
	constructor(run, opRequired){
		this.#command = run;
		this.#op = opRequired;
	}
	run(executor, args){
		if(executor.op >= this.#op){
			this.executor = executor;
			return this.#command(...args);
		}else{
			return `You don't have permission to run this command`;
		}
	}
};

//global variables

const logs = [], players = new Map();
players.getByID = id => [...players.values()].find(player => player.id == id);
players.getByName = name => [...players.values()].find(player => player.username == name);

const version = {
	name: 'prototype_5-19',
	text: 'Prototype 5-19',
	group: 'prototype'
};

//load config and settings and things
const config = fs.existsSync('./config.ini') ? ini.parse(fs.readFileSync('./config.ini', 'utf-8')) : {};

const ops = fs.existsSync('./ops.json') ? JSON.parse(fs.readFileSync('./ops.json', 'utf-8')) : {};

const whitelist = fs.existsSync('./whitelist.json') ? JSON.parse(fs.readFileSync('./whitelist.json', 'utf-8')) : {};

const blacklist = fs.existsSync('./blacklist.json') ? JSON.parse(fs.readFileSync('./blacklist.json', 'utf-8')) : {};

//commands

const commands = {
	kick: new Command(function(player, ...reason){
		players.getByName(player).kick(reason);
		log(`${this.executor.username} kicked ${player}. Reason: ${reason.join(' ')}`);
		return 'Kicked ' + player;
	}, 3),
	ban: new Command(function(player, ...reason){
		players.getByName(player).ban(reason);
		log(`${this.executor.username} banned ${player}. Reason: ${reason.join(' ')}`);
		return 'Banned ' + player;
	}, 4),
	unban: new Command(function(player){
		Player.getID(player).then(id => {
			blacklist.splice(blacklist.indexOf(id), 1);
			fs.writeFileSync('./blacklist.json', JSON.stringify(blacklist));
		});
	}, 4),
	log: new Command(function(...message){
		log(`${this.executor.username} logged ${message.join(' ')}`);
	}, 1),
	msg: new Command(function(player, ...message){
		if(players.getByName(player) instanceof Player){
			players.getByName(player).socket.emit(`[${this.executor.username} -> me] ${message.join(' ')}`);
			log(`[${this.executor.username} -> ${player}] ${message.join(' ')}`);
			players.getByName(player).lastMessager = this.executor;
			return `[me -> ${this.executor.username}] ${message.join(' ')}`;
		}else{
			return 'That user is not online'
		}
	}, 0),
	reply: new Command(function(...message){
		return this.executor.lastMessager ? 
		commands.msg.run(this.executor, [this.executor.lastMessager.username, ...message])
		: 'No one messaged you yet =('
		
	}, 0)
};
const runCommand = (command, player) => {
	try {
		let parsed = command.split(' '),
		hasRun = false,
		result = parsed.filter(p => p).reduce((o, p, i) => o?.[p] instanceof Command ? (hasRun = true, o?.[p].run(player, parsed.slice(i + 1))) : hasRun ? o : o?.[p] ? o?.[p] : new ReferenceError('Command does not exist'), commands) ?? '';
		player.socket.emit('chat', result);
	} catch (err) {
		log(`Command "${command}" failed: ${err}`);
		player.socket.emit('chat', `Command "${command}" failed: ${err.stack}`);
	}
};


//Babylon stuff
//const engine = new NullEngine();

//Socket handling
const io = new (require('socket.io').Server)(server, {
	pingInterval: 1000,
	pingTimeout: 10000,
	cors : {origin: config.allow_from_all ? '*' : 'https://blankstorm.drvortex.dev'}
});
io.use((socket, next) => {
	API.user('token', socket.handshake.auth.token).then(res => {
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
			}else if(players.getByID(user.id)){
				next(new Error('Connection refused: already connected'));
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
	io.emit('playerlist', [...players.values()].slice(0, 25).map(data => data.username));
	socket.onAny(eventName => {
		player.sentPackets++;
	});
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
		io.emit('playerlist', [...players.values()].slice(0, 25).map(data => data.username));
	});
	socket.on('command', commands => {
		runCommand(commands, player);
	});
	socket.on('chat', data => {
		log(`[Chat] ${player.username}: ${data}`);
		io.emit('chat', `${player.username}: ${data}`);
	});
});

setInterval(e => {
	players.forEach(player => {
		if(player.sentPackets > 50){
			player.kick('Sending to many packets');
		}
		player.sentPackets = 0;
	});
}, 1000);

server.listen(config.port ?? 1123, e => log('server started'));