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
			erasePlayer(player){
				//Set font size to ensure text measurements are correct
				ctx.font = "20px Courier New";
				//Clear a rectangle covering the player's former position
				ctx.clearRect(player.x-Math.max(((ctx.measureText(player.name).width)+10)/2, 30), player.y-30, Math.max((ctx.measureText(player.name).width)+10, 60), 80);
				for(let player2 of Object.keys(this.playerList)){
					//Redraw any players within the rectangle of destruction
					if(this.playerList[player2] != player){
						if(Math.abs(this.playerList[player2].x - player.x) < Math.max((ctx.measureText(player.name).width), 60) || Math.abs(this.playerList[player2].y - player.y) < 80)
							this.drawPlayer(this.playerList[player2]);
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