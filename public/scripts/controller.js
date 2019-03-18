document.addEventListener("DOMContentLoaded",startUpController);

var serverConnection;

var leftPressTimer;
var rightPressTimer;

let timerIntervalMs = 15;

let displayConnectionInitalSetup = false;

let controllerIdNumber;

let displayConnections = {
    //example
    // 1: {
    //     id:1,
    //     connection: webrtcThingx
    // }
}
let displayId;

let p2pConnectionTesting;

//Copied straight from the Display.js so if no large changes are made think about shifting it to the p2p
function p2pAcceptOffer(offer,whoFrom){
    //got an offer so accept it and send an answer    
    let testConnection = getAWebRTC();

    testConnection.dataChannelSetupCallback = ()=>{
        if(displayConnectionInitalSetup){
            //request setting up a connection to the display when not caonnected to any
            testConnection.dataChannel.send(JSON.stringify({joinAsNewController:true}))
        }
    }

    console.log("accept an offer")
    testConnection.sendAnswerFunction = () =>{

        //this should have a single point of decleration so the display and controllers don't get out of sync
        let message = {
            p2pConnect: true,
            target: whoFrom,
            from: controllerIdNumber,
            isADisplay: false,
            answer: testConnection.answerToSend
        }
        serverConnection.send(JSON.stringify(message))
    }

    testConnection.acceptOffer(JSON.parse(offer))

    testConnection.handleMessage = (message)=>{

        
        let info = document.getElementById("locationText");
        info.innerHTML = message.data

        let shiftedDisplay = JSON.parse(message.data).shiftDisplay

        if(shiftedDisplay){
            displayId = shiftedDisplay;
        }
        
        let connectionDisplayId = JSON.parse(message.data).displayId
        if(connectionDisplayId && !displayId){
            displayId = connectionDisplayId;
        }
    }

    if(!displayId){
        displayId = whoFrom;
        displayConnectionInitalSetup = true;
    }

    displayConnections[whoFrom] = {
        id: whoFrom,
        connection: testConnection
    }
}


function setupControllerButtons(){
    let controllerButtons = document.getElementsByClassName("controllerButton")

    Object.keys(controllerButtons).forEach((key) => {
        let controllerButton = controllerButtons[key]
        controllerButton.addEventListener("pointerdown",buttonPressed)
        controllerButton.addEventListener("pointerup",buttonReleased)
        
        controllerButton.addEventListener("touchstart",touchStart)
        controllerButton.addEventListener("touchend",touchEnd)
    })
}

function buttonPressed(pointerEvent){

    //iphone has issues with the event it seems
    targetButtonValue = pointerEvent.path.find((item)=>{return item.className == "controllerButton"}).value

    if(displayId && displayConnections[displayId]){
        let connection = displayConnections[displayId].connection
        if(connection.dataChannel && connection.dataChannel.readyState == "open"){
            connection.dataChannel.send(JSON.stringify({[targetButtonValue]:true}))
        }
    }
}
function buttonReleased(pointerEvent){
    targetButtonValue = pointerEvent.path.find((item)=>{return item.className == "controllerButton"}).value

    if(displayId && displayConnections[displayId]){
        let connection = displayConnections[displayId].connection
        if(connection.dataChannel && connection.dataChannel.readyState == "open"){
            connection.dataChannel.send(JSON.stringify({[targetButtonValue]:false}))
        }
    }
}

function touchStart(touchEvent){
    targetButtonValue = touchEvent.target.value

    if(displayId && displayConnections[displayId]){
        let connection = displayConnections[displayId].connection
        if(connection.dataChannel && connection.dataChannel.readyState == "open"){
            connection.dataChannel.send(JSON.stringify({[targetButtonValue]:true}))
        }
    }
}
function touchEnd(touchEvent){
    targetButtonValue = touchEvent.target.value

    if(displayId && displayConnections[displayId]){
        let connection = displayConnections[displayId].connection
        if(connection.dataChannel && connection.dataChannel.readyState == "open"){
            connection.dataChannel.send(JSON.stringify({[targetButtonValue]:false}))
        }
    }
}

function connectWebSocket(){

    //ws uses the same server so need to have a redirect.
    serverConnection = new WebSocket(`wss://${self.location.host}`);
    // serverConnection = new WebSocket(`ws://${self.location.host}`); //for localhost testing changeing it to non secure websockets as i have been a bit lazy in using openssl to create a self assinged certificate

    serverConnection.onopen = ()=> {
        console.log("websocket open")
        serverConnection.send(JSON.stringify({newPlayer:true}));
    }
    serverConnection.onmessage = (message) => {

        let theMessage = JSON.parse(message.data);
        
        if(theMessage.playerId){
            //show the user what player number they are
            let title = document.getElementById("titleText");

            title.innerHTML = `Person ${theMessage.playerId}`;
            controllerIdNumber = theMessage.playerId;
        }
        else if(theMessage.p2pConnect){
            if(theMessage.offer){
                p2pAcceptOffer(theMessage.offer,theMessage.from)
            }
        }
    }
}

function startUpController(){
    setupControllerButtons();
    connectWebSocket();
}