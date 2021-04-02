/*
	To set up client side:
		In HTML: 		<script src="/socket.io/socket.io.js" type="text/javascript"></script>
		In client.js	var socket = io();
*/

var socket = io();

//Canvas functions copied from whiteboard example
function isCanvasSupported() {
    var tempCanvas = document.createElement("canvas");
    return !!(tempCanvas.getContext && tempCanvas.getContext('2d'));
}


if (isCanvasSupported()) {
	var cvs;
	var ctx;

	var vm = {
		data() {
			return {
				playerList: [],
				keys: [],
				playerName: null,
				tempPlayerName: null,
			}
		},
		methods: {
			//Draws the player sprite and name on the canvas
			drawPlayer(player){
				if(player.it)
					ctx.fillStyle = "green";
				else
					ctx.fillStyle = "white";
				ctx.strokeStyle = "black";
				ctx.lineWidth = 5;
				ctx.beginPath();
				ctx.arc(player.x, player.y, 20, 0, 2 * Math.PI);
				ctx.stroke();
				ctx.fill();
				ctx.lineWidth = 2;
				ctx.font = "20px Courier New";
				ctx.fillStyle = "black"
				if(player.name == this.playerName)
				{
					ctx.fillStyle = "red";
				}
				ctx.strokeText(player.name, player.x - (ctx.measureText(player.name).width/2), player.y + 35);
				ctx.fillText(player.name, player.x - (ctx.measureText(player.name).width/2), player.y + 35);
			},
			//Erases a player, ensures that nearby characters are redrawn. An alternative to using multiple layers or clearing the whole canvas
			//I don't think this is any more efficient than clearing the whole canvas, in fact, it is probably worse in terms of efficiency
			//But it seemed like an interesting challenge
			erasePlayer(player){
				//Set font size to ensure text measurements are correct
				ctx.font = "20px Courier New";

				//Clear a rectangle covering the player's former position
				ctx.clearRect(player.x-Math.max(((ctx.measureText(player.name).width)+25)/2, 40), player.y-40, Math.max((ctx.measureText(player.name).width)+25, 80), 90);
				
				// Need to redraw any players within the rectangle of destruction
				for(let player2 of Object.keys(this.playerList)){	
					if(this.playerList[player2].name != player.name){	//Don't redraw the player that was just erased 
						//Compute difference in coordinates
						let xDiff = Math.abs(this.playerList[player2].x - player.x);
						let yDiff = Math.abs(this.playerList[player2].y - player.y);

						//If this player is too close to the one that was erased, redraw
						if(xDiff < Math.max((ctx.measureText(player.name).width)+25, 80) && yDiff < 90){
							this.drawPlayer(this.playerList[player2]);
						}
					}
				}
			},
			drawAllPlayers(){
				for(let player of Object.keys(this.playerList)){
					this.drawPlayer(this.playerList[player]);
				}
			},
			updatePlayer(dataFromServer){
				this.playerList[dataFromServer.index] = dataFromServer.data;
				this.erasePlayer(dataFromServer.data);
				this.drawPlayer(dataFromServer.data);
			},
			logIn(){
				if(this.tempPlayerName){
					this.playerName = this.tempPlayerName;
					socket.emit("logIn", {
						playerName: this.playerName
					});
				}	
			},
			setAllPlayers(players){
				this.playerList = players;
				this.drawAllPlayers();
			},
			removePlayer(player){
				this.erasePlayer(this.playerList[player]);
				delete this.playerList[player];
			},
			
			//Keep server-side keyboard state updated
			keyDown(keyCode){
				if(this.keys.indexOf(keyCode) == -1)
				{
					this.keys.push(keyCode);
					socket.emit("keyEvent", this.keys);
					console.log(this.keys);
				}
			},
			keyUp(keyCode){
				let i = this.keys.indexOf(keyCode);
				this.keys.splice(i, 1);
				socket.emit("keyEvent", this.keys);
				console.log(this.keys);
			}
		},
		computed: {
			//Returns the name of the player who is it
			it(){
				for(let player of Object.keys(this.playerList)){	
					if(this.playerList[player].it){
						return this.playerList[player].name;
					}
				}
				return "Nobody";
			}
		},
		mounted(){
			cvs = document.getElementById("playfield");
			ctx = cvs.getContext('2d');
 
			// from: https://forum.vuejs.org/t/capture-keypress-for-all-keys/14560
			window.addEventListener("keydown", function(e) {
				this.keyDown(e.keyCode);
			}.bind(this));
			window.addEventListener("keyup", function(e) {
				this.keyUp(e.keyCode);
			}.bind(this));
		}
	};

	var app = Vue.createApp(vm).mount("#main");

	//Set up handlers for socket events
	socket.on("updatePlayer", function(dataFromServer){
		app.updatePlayer(dataFromServer);
	});

	socket.on("allPlayers", function(dataFromServer){
		app.setAllPlayers(dataFromServer);
	});

	socket.on("playerLeft", function(dataFromServer){
		app.removePlayer(dataFromServer);
	});
}