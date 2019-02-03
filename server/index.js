const express = require("express")
const server = express()

const webSocketMessages = require("./webSocketMessages")

const port = process.env.PORT || 3000;
const WEBSOCKETPORT = 43211;

server.use(express.json())
server.use(express.static(__dirname+"/../public"))

const localInfo = require('os')


//to allow the page to grab the ip for the websocket connection while testing locally
server.get('/getIp',(req,res)=>{
    //the hardcoded 1 in here is to grab the second entry which is ipv4 not the ipv6
        //This is something that should be corrected to be less flimsy
            //maybe list it out and have the user who started it select the option they want
    let serverIp = localInfo.networkInterfaces()["Wi-Fi"][1].address;
    
    res.send({serverIp});
})


server.listen(port,function(){
    console.log(`Server started on port ${port}`)
})

webSocketMessages.start(WEBSOCKETPORT,() =>{
    console.log(`websocket stuff setup on port ${WEBSOCKETPORT}`)
});