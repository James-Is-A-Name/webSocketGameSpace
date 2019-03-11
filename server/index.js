const express = require("express")
const app = express()
let webSocket = require("ws").Server;

const webSocketMessages = require("./webSocketMessages")

const port = process.env.PORT || 3000;
const websocketport = port;
// const websocketport = 43211;

app.use(express.json())
app.use(express.static(__dirname+"/../public"))

const localInfo = require('os')


let server = require("http").createServer();

//to allow the page to grab the ip for the websocket connection while testing locally
app.get('/getIp',(req,res)=>{
    //the hardcoded 1 in here is to grab the second entry which is ipv4 not the ipv6
        //This is something that should be corrected to be less flimsy
            //maybe list it out and have the user who started it select the option they want
    // let serverIp = localInfo.networkInterfaces()["Wi-Fi"][1].address;
    
    // res.send({serverIp});
    res.send({serverIp:"127.0.0.1", message:"yeah this route will be changed or removed later"})
})


server.on('request',app)


let webSocketServer = new webSocket({server: server});


webSocketMessages.start(websocketport,webSocketServer,() =>{
    console.log(`websocket stuff setup on port ${websocketport}`)
});



server.listen(port,function(){
    console.log(`Server started on port ${port}`)

    
    let serverIp = localInfo.networkInterfaces()["Wi-Fi"][1].address;
    
    console.log(`the ip adress is ${serverIp}`)
})