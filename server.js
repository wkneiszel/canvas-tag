const { sign } = require("crypto");
var express = require("express");
var app = express();
var http = require("http");
var server = http.Server(app);
var socketio = require("socket.io");
var io = socketio(server);
app.use(express.static("pub"));

//Object which holds the data for each player. The index is the player's socket id, except in the case of the bots
var players = {};

//Object which holds an array of which keys are pressed by each client
var keys = {};

//Object which holds collisions between players. The key is each player's socket id, the value is an array of the socket ids of the 
//players with whom they are in contact.
var collisions = {};

//Takes the array of keys pressed by the client and calculates their player's motion for this tick off of that
//It is important to use the keypresses instead of simply getting the calculated movement or coordinates from the client
//To prevent client-side tampering with the code in order to cheat by increasing speed or teleporting
function playersMove(){
	for(let player of Object.keys(players)){
		let changed = false;
		if (keys[player].includes(87) && keys[player].includes(68)){	//W D
			players[player].y -= Math.sqrt(2)*5;
			players[player].x += Math.sqrt(2)*5;
			changed = true;
		}
		else if (keys[player].includes(83) && keys[player].includes(68)){	//S D
			players[player].y += Math.sqrt(2)*5;
			players[player].x += Math.sqrt(2)*5;
			changed = true;
		}
		else if (keys[player].includes(83) && keys[player].includes(65)){	// A S
			players[player].y += Math.sqrt(2)*5;
			players[player].x -= Math.sqrt(2)*5;
			changed = true;
		}
		else if (keys[player].includes(87) && keys[player].includes(65)){	//W A
			players[player].y -= Math.sqrt(2)*5;
			players[player].x -= Math.sqrt(2)*5;
			changed = true;
		}
		else if(keys[player].includes(87)){	//W
			players[player].y -= 10;
			changed = true;
		}
		else if(keys[player].includes(65)){	//A
			players[player].x -= 10;
			changed = true;
		}
		else if(keys[player].includes(83)){	//S
			players[player].y += 10;
			changed = true;
		}
		else if(keys[player].includes(68)){	//D
			players[player].x += 10;
			changed = true;
		}
		if(changed){
			//Screen wrap (PacMan style)
			if(players[player].x > 850){
				players[player].x = -50;
			}
			if(players[player].x < -50){
				players[player].x = 850;
			}
			if(players[player].y > 850){
				players[player].y = -50;
			}
			if(players[player].y < -50){
				players[player].y = 850;
			}
			io.emit("updatePlayer", {
				index: player,
				data: players[player]
			});
		}
	}
}

//Returns true is the two players are overlapping
function detectCollision(player1, player2){
	return Math.abs(player1.x-player2.x) < 40 && Math.abs(player1.y-player2.y) < 40;
}

//Calculate tagging. Need to detect when players first collide, then flip who is it
//It is important not to flip who is it on every tick where two players are overlapping, because they will be 
//In contact for several ticks, which would mean some uncertainty when it comes to who leaves the encounter it
function calculateCollisions(){
	for(let player1 of Object.keys(players)){
		for(let player2 of Object.keys(players)){
			if(player1 != player2){
				//If the two players have collided, note that in the collisions object
				if(detectCollision(players[player1], players[player2])){
					if(!collisions[player1].includes(player2)){
						collisions[player1].push(player2);

						//If a collision occurs between the player who is it and someone else, then the other player is now it.
						if(players[player1].it || players[player2].it){
							console.log("Tag, you're it!");
							players[player1].it = !players[player1].it;
							players[player2].it = !players[player2].it;
							taggedBy[player1] = player2;
							taggedBy[player2] = player1;

							//Update the players to the client
							io.emit("updatePlayer", {
								index: player1,
								data: players[player1]
							});
							io.emit("updatePlayer", {
								index: player2,
								data: players[player2]
							});
						}
					}
					//Need to update the inverse as well
					if(!collisions[player2].includes(player1)){
						collisions[player2].push(player1);
					}
				}
				//If the two players have not collided, but they are noted as colliding, a separation has occurred. 
				else{
					if(collisions[player1].includes(player2)){
						collisions[player1].splice(collisions[player1].indexOf(player2), 1);
						//Need to update the inverse as well
						collisions[player2].splice(collisions[player2].indexOf(player1), 1);
					}
				}
			}
		}
	}
}

//HorizontalBot code
var right = true;
function horizontalBotMove(){
	if(right){
		players["h"].x += 10;
	}
	else{
		players["h"].x -= 10;
	}
	if(players["h"].x > 700 || players["h"].x < 100)
		right = !right;
	io.emit("updatePlayer", {
		index: "h",
		data: players["h"]
	});
}

//VerticalBot code
var down = true;
function verticalBotMove(){
	if(down){
		players["v"].y += 10;
	}
	else{
		players["v"].y -= 10;
	}
	if(players["v"].y > 700 || players["v"].y < 100)
		down = !down;
	io.emit("updatePlayer", {
		index: "v",
		data: players["v"]
	});
}

var taggedBy = [];
//Calculates the next move of any tagster (bots that chase and flee)
function tagsterMove(socketId){
	let closestPlayerDistance = 1000;
	let dx = 0;
	let dy = 0;

	if(players[socketId].it){	//Chase
		for(let player of Object.keys(players)){
			if(player == socketId || player == taggedBy[socketId]){
				continue;	
			}

			let xDiff = (players[player].x - players[socketId].x) % 800;
			let yDiff = (players[player].y - players[socketId].y) % 800;
			let distanceToPlayer = Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2));
			
			//Change selection of closest player
			//One thing is that the player you're chasing can't be overlapping with you, or else you will not be able to tag them
			if(distanceToPlayer < closestPlayerDistance && distanceToPlayer > 40){
				closestPlayerDistance = distanceToPlayer;

				//Calculate vector components for motion
				let theta = Math.asin(yDiff/distanceToPlayer);
				dx = 5 * Math.cos(theta) * Math.sign(xDiff);
				dy = 5 * Math.sin(theta);				
			}
		}

		players[socketId].x += dx;
		players[socketId].y += dy;
	}
	else{	//Flee in a random direction
		players[socketId].x += tagsterDirections[socketId].dx;
		players[socketId].y += tagsterDirections[socketId].dy;
	}

	//Screen wrap (PacMan style)
	if(players[socketId].x > 850){
		players[socketId].x = -50;
	}
	if(players[socketId].x < -50){
		players[socketId].x = 850;
	}
	if(players[socketId].y > 850){
		players[socketId].y = -50;
	}
	if(players[socketId].y < -50){
		players[socketId].y = 850;
	}

	io.emit("updatePlayer", {
		index: socketId,
		data: players[socketId]
	});

	//Randomly change the direction of fleeing
	if(Math.floor(Math.random() * 200) == 100){
		tagsterDirections[socketId] = {
			dx: (Math.random() * 10) - 5,
			dy: (Math.random() * 10) - 5
		};
	}
}

function tagsterActions(){
	for(let tagster of tagsters){
		tagsterMove(tagster);
	}
}

var tagsters = [];
var tagsterDirections = [];
var tagsterCount = 0;
var tagsterNames = ["Allen", "Marc", "Angelo", "Frederique", "Pasquale", "Guillermo", "Giuseppe", "Lorraine", "Hans", "Alberto", "Yolanda", 
					"Rita", "Norman", "Glen", "Tina", "Gertrude", "Olga", "Pacman", "Helena", "Gwenda", "Astrud", "Astrid", "Norma", "Cool Phil", 
					"The Alamo", "Patricia", "Edgardo", "Bartholomew", "Sven", "Larry", "Tony", "Glenda", "Gwen", "Justin", "Penelope", "Pete", 
					"Earnest", "Jorge", "Madeline", "Ben", "Julieta", "Clark", "Bob", "Lucile", "Gordo", "Wallow", "Annie", "Jack", "Beth", "Chris",
					"Danny", "Sandy", "Daisuke", "Ryugi", "Yoshi", "Paco", "Reina", "Logan", "Andy", "Stella", "Tangy", "Bugsly", "Cindy", "Mindy", 
					"Scooter", "Jenny", "Brie", "Koko", "Dante", "Chester", "Chet", "Hilda", "Vlad", "Sergei", "Pavel", "Iakov", "Bjorn", "Tsubasa",
					"Fritz", "Keiko", "Magnolia", "Daisy", "Rose", "Oliver", "Woody", "Lena", "Maximilian", "Felix", "Ahmed", "Esma", "Ida", "Bence",
					"Mikael", "Noam", "Yosef", "Leonardo", "Ginevra", "Giulia", "Henrik", "Santiago", "Beatriz", "Viktoriya", "Artyom", "Hugo", "Mohamed",
					"Mamadou", "Imene", "Fatima", "Mariam", "Enzo", "Davit", "Yusif", "Wei", "Amir-Ali", "Elie", "Rashid", "Honoka", "Odval", "Saoirse",
					"Tao", "Hitomi", "Kyoko", "Chang", "Xiuying", "Asuka", "Hikari", "Sedol"];

function addNewTagster(){
	let tagsterId = tagsterCount++;
	let tagsterName = tagsterNames[Math.floor(Math.random() * tagsterNames.length)];
	tagsterDirections[tagsterId] = {
		dx: (Math.random() * 10) - 5,
		dy: (Math.random() * 10) - 5
	};
	players[tagsterId] = {
		name: tagsterName,
		x: Math.floor(Math.random() * 600)+100,
		y: Math.floor(Math.random() * 600)+100,
		it: (tagsterCount == 1)
	};
	keys[tagsterId] = [];
	collisions[tagsterId] = [];
	taggedBy[tagsterId] = "";
	tagsters.push(tagsterId);
}

//Function which contains the actions to be taken by the bots each tick.
var botActions = function(){};

//Adds verticalBot and horizontalBot
function addOldBots(){
	players = {
		"h": {
			name: "horizontalBot",
			x: 200,
			y: 400,
			it: true
		},
		"v": {
			name: "verticalBot",
			x: 400,
			y: 200,
			it: false
		},
	};
	collisions = {"h": [], "v": []};
	keys = {"h": [], "v": []};

	botActions = function(){
		horizontalBotMove();
		verticalBotMove();
	};
}

//Adds bots to the game
function addBots(){
	for(let i = 0; i < 20; i++){
		addNewTagster();
	}

	botActions = function(){
		tagsterActions();
	};
}

//Note: if you call this function, you will get bots
addBots();

//Tick function for movement and other regular calculations
setInterval(
	function(){ 
		botActions();
		playersMove();
		calculateCollisions();
	},50);

//Setting up Socket.Io for each new connection
io.on("connection", function(socket) {
	console.log("Somebody connected.");

	//When a new client logs in, inform everyone, and add a new entry in the keys, collisions, and players objects
	socket.on("logIn", function(dataFromClient){
		//first player to connect should be it 
		let newPlayerIt = false;
		if(Object.keys(players).length == 0) {
			newPlayerIt = true;
		}

		//Add the new connection to keys, collisions, and players
		keys[socket.id] = [];
		collisions[socket.id] = [];
		taggedBy[socket.id] = "";
		players[socket.id] = {
			name: dataFromClient.playerName,
			x: Math.floor(Math.random() * 600)+100,
			y: Math.floor(Math.random() * 600)+100,
			it: newPlayerIt
		};

		//Return the socket.id to the client (so they can tell which player is them)
		socket.emit("yourSocket", socket.id);
		
		//Send the new client all the players' data
		socket.emit("allPlayers", players);

		//Let everyone know somebody new is here
		io.emit("updatePlayer", {
			index: socket.id,
			data: players[socket.id]
		});
	});

	//When the client presses a key, the keys object should be updated to reflect the current state of their keyboard
	socket.on("keyEvent", function(dataFromClient){
		keys[socket.id] = dataFromClient;
	});

	//When a player leaves, we need to tell everyone
	//Also clears out entries for that player in players, keys, and collisions object
	socket.on("disconnect", function() {
		console.log("Somebody disconnected.");

		//If they disconnect before joining the game, no need to clear any data
		if(!players[socket.id]){
			return;
		}

		//We cannot allow someone to run away with "it", as this would kill the game. 
		let theyWereIt = false;
		if(players[socket.id].it){
			theyWereIt = true;
		}

		//Remove the player from game data structures
		delete players[socket.id];
		delete keys[socket.id];
		delete collisions[socket.id];

		//If the last player disconnects, nobody is left to make it
		if(Object.keys(players).length == 0) {
			return;
		}

		//Otherwise, we should make a random player it if the player who left was it.
		if(theyWereIt){
			//Assign it to a random player. Code based on https://stackoverflow.com/questions/2532218/pick-random-property-from-a-javascript-object
			var indices = Object.keys(players);
			var newIt = indices[indices.length * Math.random() << 0];
			console.log(players[newIt].name + " is it now.");
			players[newIt].it = true;
		}

		//Need to emit all players to ensure that clients update who is it. 
		io.emit("allPlayers", players)
	});
});

server.listen(80, function() {
	console.log("Server with socket.io is ready.");
});

