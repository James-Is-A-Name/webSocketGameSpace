document.addEventListener("DOMContentLoaded",getServerIp);

var serverConnection;

var leftPressTimer;
var rightPressTimer;

let timerIntervalMs = 15;

function leftStart(){
    console.log("left pressed")
    serverConnection.send(JSON.stringify({moveLeft:true}));
}
function leftStop(){
    serverConnection.send(JSON.stringify({moveLeftHalt:true}));
}

function rightStart(){
    console.log("right pressed")

    serverConnection.send(JSON.stringify({moveRight:true}));
}
function rightStop(){
    serverConnection.send(JSON.stringify({moveRightHalt:true}));
}

function actionPressed(){
    serverConnection.send(JSON.stringify({actionDo:true}));
}

function connectWebSocket(serverIp){

    //get a websocekt connection
    // let serverIpAddress = "192.168.1.82"
    let serverIpAddress = "localhost"
    // serverConnection = new WebSocket(`ws://${serverIp}:43211`);
    serverConnection = new WebSocket(`ws://${serverIp}:3000`); //now using the same port as the http server. will need to change this when deploying to something

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
        }
        if(theMessage.playerDisplay){
            let playerLocation = document.getElementById("locationText");
            playerLocation.innerHTML = `on Display ${theMessage.playerDisplay}`;
        }
    }
}

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