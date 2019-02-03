
let webSocket = require("ws").Server;


//This is not safe, would need atomic interaction
let idRefNumber = 1;

//this should just be an object/class thing
let webSocketsConnected = []

function webSocketSetup(portNum , completedCallback){

    let webSocketServer = new webSocket({port:portNum});
    
    webSocketServer.on("connection",(ws)=>{
        //This should be atomic or handed off to a locking function or something
            //except node might be single thread based. still dosent feel nice
        let id = idRefNumber;
        idRefNumber++;
        
        let theWebsocket = {
            id,
            ws,
            isDisplay: false,
            ended: false
        }

        webSocketsConnected.push(theWebsocket);

        ws.on("close",()=>{
            console.log("socket state is  ",theWebsocket.ws.readystate)
            theWebsocket.ended = true;
        })

        ws.on("message",(message)=>{
            let theMessage = JSON.parse(message);


            if(theMessage.actAsDisplay){
                theWebsocket.isDisplay = true;
                console.log("display connected");
            }
            else if(theMessage.newPlayer){
                ws.send(JSON.stringify({playerId:theWebsocket.id}))

                sendMessageToDisplays({
                    newPlayerId : theWebsocket.id
                });
            }
            else{
                sendMessageToDisplays(theMessage,theWebsocket.id)
            }
        })
    })

    completedCallback();
}

function sendMessageToDisplays(theMessage,senderId){
    
    let displays = webSocketsConnected.filter((connection)=>{
        return connection.isDisplay
    })

    if(displays.length > 0){
        displays.forEach((display)=>{
            theMessage.id = senderId;
            
            let messageToSend = JSON.stringify(theMessage);

            
            if(display.ws.readyState === 1){
                display.ws.send(messageToSend);
            }
        })
    }
}



module.exports = {
    start: webSocketSetup
}