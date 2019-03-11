document.addEventListener("DOMContentLoaded",startUpController);

var serverConnection;

var leftPressTimer;
var rightPressTimer;

let timerIntervalMs = 15;

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

    // p2pConnectionTesting = testConnection;

    /*-------------------TESTING--------------------------*/
    //This might fail straight away
    testConnection.handleMessage = (message)=>{
        console.log(`Outside the object got this from ${whoFrom}`,message.data);

        let shiftedDisplay = JSON.parse(message.data).shiftDisplay

        if(shiftedDisplay){
            console.log("change display to ",shiftedDisplay)
            displayId = shiftedDisplay;
        }

        
        let connectionDisplayId = JSON.parse(message.data).displayId

        if(connectionDisplayId && !displayId){
            displayId = connectionDisplayId;
        }
    }
    /*-------------------TESTING--------------------------*/

    if(!displayId){
        displayId = whoFrom;
    }

    displayConnections[whoFrom] = {
        id: whoFrom,
        connection: testConnection
    }
}


function setupControllerButtons(){
    let controllerButtons = document.getElementsByClassName("controllerButton")

    
    console.log(controllerButtons);

    Object.keys(controllerButtons).forEach((key) => {
        let controllerButton = controllerButtons[key]
        controllerButton.addEventListener("pointerdown",buttonPressed)
        controllerButton.addEventListener("pointerup",buttonReleased)
        
        controllerButton.addEventListener("touchstart",touchStart)
        controllerButton.addEventListener("touchend",touchEnd)
            
        // controllerButton.addEventListener("touchstart",buttonPressed, false)
        // controllerButton.addEventListener("touchend",buttonReleased, false)
    })
}

function buttonPressed(pointerEvent){

    //iphone has issues with the event it seems
    targetButtonValue = pointerEvent.path.find((item)=>{return item.className == "controllerButton"}).value
    serverConnection.send(JSON.stringify({[targetButtonValue]:true}));

    if(displayId && displayConnections[displayId]){
        let connection = displayConnections[displayId].connection
        if(connection.dataChannel && connection.dataChannel.readyState == "open"){
            connection.dataChannel.send(JSON.stringify({[targetButtonValue]:true}))
        }
    }
}
function buttonReleased(pointerEvent){
    targetButtonValue = pointerEvent.path.find((item)=>{return item.className == "controllerButton"}).value
    serverConnection.send(JSON.stringify({[targetButtonValue]:false}));

    
    if(displayId && displayConnections[displayId]){
        let connection = displayConnections[displayId].connection
        if(connection.dataChannel && connection.dataChannel.readyState == "open"){
            connection.dataChannel.send(JSON.stringify({[targetButtonValue]:false}))
        }
    }
}

function touchStart(touchEvent){

    //iphone has issues with the event it seems
    // targetButtonValue = pointerEvent.path.find((item)=>{return item.className == "controllerButton"}).value
    targetButtonValue = touchEvent.target.value
    serverConnection.send(JSON.stringify({[targetButtonValue]:true}));
    
    
    if(displayId && displayConnections[displayId]){
        let connection = displayConnections[displayId].connection
        if(connection.dataChannel && connection.dataChannel.readyState == "open"){
            connection.dataChannel.send(JSON.stringify({[targetButtonValue]:true}))
        }
    }
}
function touchEnd(touchEvent){
    // targetButtonValue = pointerEvent.path.find((item)=>{return item.className == "controllerButton"}).value
    targetButtonValue = touchEvent.target.value
    serverConnection.send(JSON.stringify({[targetButtonValue]:false}));

    if(displayId && displayConnections[displayId]){
        let connection = displayConnections[displayId].connection
        if(connection.dataChannel && connection.dataChannel.readyState == "open"){
            connection.dataChannel.send(JSON.stringify({[targetButtonValue]:false}))
        }
    }
}

function testing(){
    serverConnection.send(JSON.stringify({action1:true}));
}

function connectWebSocket(serverIp){

    //get a websocekt connection
    // let serverIpAddress = "192.168.1.82"
    let serverIpAddress = "localhost"
    // serverConnection = new WebSocket(`ws://${serverIp}:43211`);
    // serverConnection = new WebSocket(`ws://${serverIp}:3000`); //now using the same port as the http server. will need to change this when deploying to something

    //ws uses the same server so need to have a redirect.
    serverConnection = new WebSocket(`ws://${self.location.host}`);

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
        }/*----------------------Testing-----------------------------*/
        else if(theMessage.p2pConnect){

            // if(theMessage.answer){
            //     p2pAcceptAnswer(theMessage.answer,theMessage.from)
            // }
            // else if(theMessage.offer){
            if(theMessage.offer){
                p2pAcceptOffer(theMessage.offer,theMessage.from)
            }
        }
        /*----------------------Testing-----------------------------*/
        if(theMessage.playerDisplay){
            let playerLocation = document.getElementById("locationText");
            playerLocation.innerHTML = `on Display ${theMessage.playerDisplay}`;
        }
    }
}

function startUpController(){
    setupControllerButtons();
    getServerIp();
}

//outdated. plan on removing later
function getServerIp(){
    
    fetch("/getIp").then(response => {

        response.text().then((text)=>{
            let serverIp = JSON.parse(text).serverIp;

            connectWebSocket(serverIp);

        }).catch((err)=>{
            console.log("something went wrong the computer says")
        })
    })
    .catch((err)=>{
    console.log("i porbably wrote something wrong got err of ",err)
    })
}