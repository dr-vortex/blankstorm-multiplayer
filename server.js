//modules
const
https = require('https'), fs = require('fs'), ini = require('ini'),
server = require('http').createServer((req, res) => {
    if(req.url == '/ping'){
        log('recieved ping');
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
//global variables

const logs = [], chat = [], players = {};
let ops = {}, whitelist = [], blacklist = [];

//load config and settings and things

const config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
let opsString = fs.readFileSync('./ops.json','utf-8');
if(isJSON(opsString)){ops = JSON.parse(opsString)}
if(config.whitelist){
    let whitelistString = fs.readFileSync('./whitelist.json', 'utf-8');
    if(isJSON(whitelistString)){
        whitelist = JSON.parse(whitelistString);
    }else{
        log('Error reading whitelist: not JSON');
    }
}
if(config.blacklist){
    let blacklistString = fs.readFileSync('./blacklist.json', 'utf-8');
    if(isJSON(blacklistString)){
        blacklist = JSON.parse(blacklistString);
    }else{
        log('Error reading blacklist: not JSON');
    }
}

//Babylon stuff
//const engine = new NullEngine();

//Socket handling
io.use((socket, next) => {
	get('https://annihilation.drvortex.dev/api/user?token=' + socket.handshake.auth.token, res => {
		if(isJSON(res) && !res.includes('ERROR') && res != 'null'){
			user = JSON.parse(res);
			log(`${user.username} (${user.id}) connected with id ${socket.id}`);
			players[socket.id] = socket.user = {socket: socket, id: user.id, username: user.username, oplvl: parseFloat(user.oplvl)};
			next();
		}else{
			next(new Error('Connection refused: invalid token'));
		}
	});
});
io.use((socket, next) => {
    if(io.sockets.sockets.size >= config.max_players && (ops[socket.user.id] && !ops[socket.user.id].bypassLimit)){
        next(new Error('Connection refused: server full'));
    }
    next();
});
io.on('connection', socket => {
	socket.on('disconnect', reason => {
	   log(socket.user.username + ' disconnected: ' + reason);
	   delete players[socket.id];
	});
	socket.on('packet', (type, data) => {
		log('recieved packet: '+type);
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
				if(ops[socket.user.id] && ops[socket.user.id].level > 0){
					socket.emit('packet', logs);
				}else{
					socket.emit('packet', 'Forbidden');
				}
				break;
			case 'chat':
				log(`[Chat] ${socket.user.username}: ${data}`);
				io.emit('chat',{user: socket.user.username,  content: data});
				break;
			default:
				socket.emit('packet',`"${type}" packet not accepted`);
		}
	});
});
server.listen(80, e => log('server started'));