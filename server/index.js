const express = require("express")
const app = express()
let webSocket = require("ws").Server;

const webSocketMessages = require("./webSocketMessages")

const port = process.env.PORT || 3000;
const websocketport = port;

app.use(express.json())
app.use(express.static(__dirname+"/../public"))

const localInfo = require('os')

let server = require("http").createServer();

server.on('request',app)

let webSocketServer = new webSocket({server: server});

webSocketMessages.start(websocketport,webSocketServer,() =>{
    console.log(`websocket stuff setup on port ${websocketport}`)
});

server.listen(port,function(){
    console.log(`Server started on port ${port}`)
    
    // let serverIp = localInfo.networkInterfaces()["Wi-Fi"][1].address;
    // console.log(`the ip adress is ${serverIp}`)
})