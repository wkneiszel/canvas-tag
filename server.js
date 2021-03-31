var express = require("express");
var app = express();
var http = require("http");
var server = http.Server(app);
var socketio = require("socket.io");
var io = socketio(server);
app.use(express.static("pub"));

//On the server side, you also need to do:
//	npm install express
//	npm install socket.io

var players = {
	"h": {
		name: "horizontalBot",
		x: 200,
		y: 400,
		it: false
	},
	"v": {
		name: "verticalBot",
		x: 400,
		y: 200,
		it: false
	}
};

var keys = {"h": [], "v": []};

var right = true;
function horizontalBotMove(){
	if(right){
		players["h"].x += 2;
	}
	else{
		players["h"].x -= 2;
	}
	if(players["h"].x > 700 || players["h"].x < 100)
		right = !right;
	io.emit("updatePlayer", {
		index: "h",
		data: players["h"]
	});
}

var down = true;
function verticalBotMove(){
	if(down){
		players["v"].y += 2;
	}
	else{
		players["v"].y -= 2;
	}
	if(players["v"].y > 700 || players["v"].y < 100)
		down = !down;
	io.emit("updatePlayer", {
		index: "v",
		data: players["v"]
	});
}

function playersMove(){
	for(let player of Object.keys(players)){
		let changed = false;
		if(keys[player].includes(87)){
			players[player].y -= 2;
			changed = true;
		}
		if(keys[player].includes(65)){
			players[player].x -= 2;
			changed = true;
		}
		if(keys[player].includes(83)){
			players[player].y += 2;
			changed = true;
		}
		if(keys[player].includes(68)){
			players[player].x += 2;
			changed = true;
		}
		if(changed){
			io.emit("updatePlayer", {
				index: player,
				data: players[player]
			});
		}
	}
}

// Tick function for movement
setInterval(
	function(){ 
		horizontalBotMove();
		verticalBotMove();
		playersMove();
	},10);

//Every time a client connects (visits the page) this function(socket) {...} gets executed.
//The socket is a different object each time a new client connects.
io.on("connection", function(socket) {
	console.log("Somebody connected.");

	socket.on("logIn", function(dataFromClient){
		keys[socket.id] = [];
		players[socket.id] = {
			name: dataFromClient.playerName,
			x: Math.floor(Math.random() * 100)+100,
			y: Math.floor(Math.random() * 100)+100,
			it: false
		};
		socket.emit("allPlayers", players)
		io.emit("updatePlayer", {
			index: socket.id,
			data: players[socket.id]
		});
	});

	socket.on("keyEvent", function(dataFromClient){
		keys[socket.id] = dataFromClient;
	});

	socket.on("disconnect", function() {
		//This particular socket connection was terminated (probably the client went to a different page
		//or closed their browser).
		delete players[socket.id];
		io.emit("playerLeft", socket.id);
		console.log("Somebody disconnected.");
	});
});


server.listen(80, function() {
	console.log("Server with socket.io is ready.");
});

