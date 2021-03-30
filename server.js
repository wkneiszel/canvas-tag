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

var players = {};

//Every time a client connects (visits the page) this function(socket) {...} gets executed.
//The socket is a different object each time a new client connects.
io.on("connection", function(socket) {
	console.log("Somebody connected.");

	socket.on("logIn", function(dataFromClient){
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

