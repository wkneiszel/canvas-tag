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
				ctx.font = "20px Segoe UI";
				ctx.fillStyle = "white"
				if(player.name == this.playerName)
				{
					ctx.fillStyle = "red";
				}
				ctx.strokeText(player.name, player.x - (ctx.measureText(player.name).width/2), player.y + 35);
				ctx.fillText(player.name, player.x - (ctx.measureText(player.name).width/2), player.y + 35);
			},
			drawAllPlayers(){
				for(let player of Object.keys(this.playerList)){
					this.drawPlayer(this.playerList[player]);
				}
			},
			updatePlayer(dataFromServer){
				this.playerList[dataFromServer.index] = dataFromServer.data;
				ctx.clearRect(0, 0, cvs.width, cvs.height);
				this.drawAllPlayers();
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
				ctx.clearRect(0, 0, cvs.width, cvs.height);
				this.playerList = players;
				this.drawAllPlayers();
			},
			removePlayer(player){
				ctx.clearRect(0, 0, cvs.width, cvs.height);
				delete this.playerList[player];
				this.drawAllPlayers();
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