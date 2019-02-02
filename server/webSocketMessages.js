
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

            console.log("got message of ",message)

            if(theMessage.actAsDisplay){
                theWebsocket.isDisplay = true;
                console.log("display connected");
            }
            else{
                let displays = webSocketsConnected.filter((connection)=>{
                    return connection.isDisplay
                })

                if(displays.length > 0){
                    displays.forEach((display)=>{
                        theMessage.id = webSocket.id;
                        
                        let messageToSend = JSON.stringify(theMessage);
                        if(display.ws.readystate === webSocket.OPEN){
                            display.ws.send(messageToSend);
                        }
                    })
                }
            }
        })
    })

    completedCallback();
}




module.exports = {
    start: webSocketSetup
}