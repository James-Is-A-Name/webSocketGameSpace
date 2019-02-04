
let webSocket = require("ws").Server;


//This is not safe, would need atomic interaction
let idRefNumber = 1;

//this should just be an object/class thing
let webSocketsConnected = []


//to asign an entity to a display
let playerDisplayLocation = {

}

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

            Object.keys(playerDisplayLocation).forEach((key)=>{
                if(playerDisplayLocation[key] == theWebsocket.id){
                    shiftToNextDisplay(theWebsocket.id,key);
                }
            })
            

        })

        ws.on("message",(message)=>{
            let theMessage = JSON.parse(message);


            if(theMessage.actAsDisplay){
                theWebsocket.isDisplay = true;
                console.log(`display ${theWebsocket.id} connected`);
                ws.send(JSON.stringify({displayId:theWebsocket.id}))
            }
            else if(theMessage.newPlayer){
                ws.send(JSON.stringify({playerId:theWebsocket.id}))

                // sendMessageToDisplays({
                //     newPlayerId : theWebsocket.id
                // });
                
                let firstDisplay = webSocketsConnected.find((connection)=>{
                    return connection.isDisplay && !connection.ended
                })

                if (firstDisplay){
                    playerDisplayLocation[theWebsocket.id] = firstDisplay.id;
                    console.log(`controller ${theWebsocket.id} connected to display ${firstDisplay.id}`);
                }
            }
            else if(theWebsocket.isDisplay){
                if(theMessage.shiftPlayer){
                    // let displays = webSocketsConnected.filter((connection)=>{
                    //     return connection.isDisplay
                    // })

                    // if(displays){
                    //     let nextDisplay = displays.find((display)=>{
                    //         return display.id > theWebsocket.id
                    //     })

                    //     if(nextDisplay){
                    //         playerDisplayLocation[theMessage.shiftPlayer] = nextDisplay.id
                    //     }
                    //     else{
                    //         nextDisplay = displays.find((display)=>{
                    //             return display.id != theWebsocket.id
                    //         })
                    //         if(nextDisplay){
                    //             playerDisplayLocation[theMessage.shiftPlayer] = nextDisplay.id
                    //         }
                    //     }
                    // }
                    shiftToNextDisplay(theWebsocket.id,theMessage.shiftPlayer);
                }
            }
            else{
                theMessage.id = theWebsocket.id;
                let messageToSend = JSON.stringify(theMessage);
                let display = webSocketsConnected.find((connection)=>{
                    return connection.id == playerDisplayLocation[theWebsocket.id]
                });

                if(display && display.ws.readyState === 1){
                    display.ws.send(messageToSend);
                }
                // sendMessageToDisplays(theMessage,theWebsocket.id)
            }
        })
    })

    completedCallback();
}
function shiftToNextDisplay(currentDisplay,player){
    let displays = webSocketsConnected.filter((connection)=>{
        return connection.isDisplay
    })

    if(displays){
        let nextDisplay = displays.find((display)=>{
            return display.id > currentDisplay && !display.ended
        })

        if(nextDisplay){
            playerDisplayLocation[player] = nextDisplay.id;
            nextDisplay.ws.send(JSON.stringify({newPlayerId:player}));
            let playerConnection = webSocketsConnected.find((connection)=>{
                return connection.id == player
            })
            if(playerConnection){

                playerConnection.ws.send(JSON.stringify({playerDisplay:playerDisplayLocation[player]}));
            }
        }
        else{
            nextDisplay = displays.find((display)=>{
                return display.id != currentDisplay && !display.ended
            })
            if(nextDisplay){
                playerDisplayLocation[player] = nextDisplay.id
                nextDisplay.ws.send(JSON.stringify({newPlayerId:player}));


                let playerConnection = webSocketsConnected.find((connection)=>{
                    return connection.id == player
                })
                if(playerConnection){

                    playerConnection.ws.send(JSON.stringify({playerDisplay:playerDisplayLocation[player]}));
                }
            }
        }
    }
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