

//This is not safe, would need atomic interaction
let idRefNumber = 1;

//this should just be an object/class thing
let webSocketsConnected = []

//to asign an entity to a display
let playerDisplayLocation = {

}

function webSocketSetup(portNum, webSocketServer, completedCallback){

    // let webSocketServer = new webSocket({port:portNum});
    
    webSocketServer.on("connection",(ws)=>{
        //This should be atomic or handed off to a locking function or something
            //except node might be single thread based. still dosent feel nice
        let id = idRefNumber;
        idRefNumber++;
        
        let theWebsocket = {
            id,
            ws,
            isDisplay: false,
            ended: false,
            controllerHistory: {},
        }

        webSocketsConnected.push(theWebsocket);

        ws.on("close",()=>{
            console.log(`socket ${theWebsocket.id} state is closed`)
            theWebsocket.ended = true;

            Object.keys(playerDisplayLocation).forEach((key)=>{
                if(playerDisplayLocation[key] == theWebsocket.id){
                    shiftToNextDisplay(theWebsocket.id,key);
                }
            })

            //if a player make it send a delete command to the display
                //could also be used for avoiding the lingering player entity
        })

        ws.on("message",(message)=>{
            let theMessage = JSON.parse(message);

            if(theMessage.actAsDisplay){
                handleNewDisplay(theWebsocket)
                sendMessageToDisplays({newDisplay:true},theWebsocket.id);
            } else if(theMessage.newPlayer){
                handleNewPlayer(theWebsocket);
            }else if(theWebsocket.isDisplay){
                handleDisplayMessage(theWebsocket,theMessage);
            }else{
                handlePlayerMessage(theWebsocket,theMessage);
            }
        })
    })

    completedCallback();
}

function handleNewDisplay(webSocket){
    webSocket.isDisplay = true;
    webSocket.ws.send(JSON.stringify({displayId:webSocket.id}))
}
function handleNewPlayer(webSocket){
    webSocket.ws.send(JSON.stringify({playerId:webSocket.id}))

    let firstDisplay = webSocketsConnected.find(connection=> connection.isDisplay && !connection.ended)

    if (firstDisplay){
        playerDisplayLocation[webSocket.id] = firstDisplay.id;
        sendMessage(firstDisplay,{newPlayerId:webSocket.id})
    }
}
function handleDisplayMessage(webSocket,message){

    let refreshState = {}

    
    if(message.shiftPlayerDirect){
        shiftToDesignatedDisplay(webSocket.id,message.shiftPlayerDirect,message.targetDisplay);
        refreshState.do = true;
        refreshState.player = message.shiftPlayerDirect;
    }
    else if(message.shiftPlayer){
        shiftToNextDisplay(webSocket.id,message.shiftPlayer);
        refreshState.do = true;
        refreshState.player = message.shiftPlayer;

    }else if(message.shiftPlayerPrevious){
        shiftToPreviousDisplay(webSocket.id,message.shiftPlayerPrevious);
        refreshState.do = true;
        refreshState.player = message.shiftPlayerPrevious;
    }


    if(refreshState.do){

        let newDisplayLocation = playerDisplayLocation[refreshState.player];

        let displayConnection = webSocketsConnected.find((connection) => connection.id == newDisplayLocation)
        let controllerConnection = webSocketsConnected.find((connection) => connection.id == refreshState.player)


        Object.keys(controllerConnection.controllerHistory).forEach((key)=>{
            if(controllerConnection.controllerHistory[key] === true){
                sendMessage(displayConnection,{id:refreshState.player,[key]:true})
            }
        })
    }
}
function handlePlayerMessage(webSocket,message){
    message.id = webSocket.id;

    webSocket.controllerHistory = {
        ...webSocket.controllerHistory,
        ...message
    }
    
    let display = webSocketsConnected.find(connection=> connection.id == playerDisplayLocation[webSocket.id]);
    sendMessage(display,message)
}

function shiftToDesignatedDisplay(currentDisplay,player,newDisplayId){

    //possibly use the current display to check it already has the player
    let displays = webSocketsConnected.filter(connection=> connection.isDisplay)
    let newDisplay = displays.find(display=> (display.id == newDisplayId))

    if(newDisplay){
        shiftPlayer(newDisplay,player)
    }

}

function shiftToNextDisplay(currentDisplay,player){
    let displays = webSocketsConnected.filter(connection=> connection.isDisplay)

    if(displays){
        let nextDisplay = displays.find(display=> ((display.id > currentDisplay) && !display.ended))

        if(nextDisplay == undefined){
            nextDisplay = displays.find(display=> display.id != currentDisplay && !display.ended)
        }
        shiftPlayer(nextDisplay,player)
    }
}
function shiftToPreviousDisplay(currentDisplay,player){
    let displays = webSocketsConnected.filter(connection=>connection.isDisplay)

    if(displays.length > 0){
        let previousDisplays = displays.filter((display)=>{
            return display.id < currentDisplay && !display.ended
        })
        let previousDisplay = undefined;
        if(previousDisplays.length>0){
            previousDisplay = previousDisplays[previousDisplays.length-1];
        }
        else if(displays[displays.length - 1].id != currentDisplay){
            previousDisplay = displays[displays.length - 1];
        }
        shiftPlayer(previousDisplay,player)
    }
}
function shiftPlayer(newDisplay,player){
    if(newDisplay != undefined){
        playerDisplayLocation[player] = newDisplay.id

        sendMessage(newDisplay,{newPlayerId:player})

        let playerConnection = webSocketsConnected.find(connection=>connection.id == player)
        if(playerConnection){
            sendMessage(playerConnection,{playerDisplay:playerDisplayLocation[player]})
        }
    }
}

//This might be unneeded
function sendMessageToDisplays(theMessage,senderId){
    
    let displays = webSocketsConnected.filter((connection)=>{
        return connection.isDisplay
    })

    if(displays.length > 0){
        displays.forEach((display)=>{
            theMessage.id = senderId;
            
            sendMessage(display,theMessage)
        })
    }
}

function sendMessage(target,theMessage){
    if(target){
        if(target.ws.readyState === 1){
            target.ws.send(JSON.stringify(theMessage));
        }
    }
}


module.exports = {
    start: webSocketSetup
}