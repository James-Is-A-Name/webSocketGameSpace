const express = require("express")
const server = express()

const webSocketMessages = require("./webSocketMessages")

const port = process.env.PORT || 3000;
const WEBSOCKETPORT = 43211;

server.use(express.json())
server.use(express.static(__dirname+"/../public"))

const localInfo = require('os')

server.listen(port,function(){
    console.log(`Server started on port ${port}`)
})

webSocketMessages.start(WEBSOCKETPORT,() =>{
    console.log(`websocket stuff setup on port ${WEBSOCKETPORT}`)
});