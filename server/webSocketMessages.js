
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
            console.log(`socket ${theWebsocket} state is closed`)
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
                handleNewDisplay(theWebsocket)
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
    // console.log(`display ${webSocket.id} connected`);
    webSocket.ws.send(JSON.stringify({displayId:webSocket.id}))
}
function handleNewPlayer(webSocket){
    webSocket.ws.send(JSON.stringify({playerId:webSocket.id}))

    let firstDisplay = webSocketsConnected.find(connection=> connection.isDisplay && !connection.ended)

    if (firstDisplay){
        playerDisplayLocation[webSocket.id] = firstDisplay.id;
        // console.log(`controller ${webSocket.id} connected to display ${firstDisplay.id}`);
        sendMessage(firstDisplay,{newPlayerId:webSocket.id})
    }
}
function handleDisplayMessage(webSocket,message){

    if(message.shiftPlayer){
        shiftToNextDisplay(webSocket.id,message.shiftPlayer);
    }else if(message.shiftPlayerPrevious){
        shiftToPreviousDisplay(webSocket.id,message.shiftPlayerPrevious);
    }
}
function handlePlayerMessage(webSocket,message){
    message.id = webSocket.id;
    let display = webSocketsConnected.find(connection=> connection.id == playerDisplayLocation[webSocket.id]);
    sendMessage(display,message)
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