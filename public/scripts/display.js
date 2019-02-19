
document.addEventListener("DOMContentLoaded",setupDisplayArea);


//THIS WHOLE THING SHOULD BE MOVED INTO A SINGLE OBJECT OR SOMETHING TO AVOID CLUTTERING UP THE GLOBAL REFERENCES
//VERY EASY FOR THIS TO TURN UGLY

let entitieSize = 50;
//should not make this 
let gameHeight = document.documentElement.clientHeight - entitieSize;
let gameWidth = document.documentElement.clientWidth - entitieSize;

let serverConnection;

//Will want to make this an object of objects not an array
    //alter elsewher eto itterate over the keys
let playerEntities={};
let playersDeleting={};

let objectPlatforms = [
    {
        x: gameWidth/2 - 100,
        width: 200,
        y: gameHeight - 100,
        height: 100
    },
    {
        x: 100,
        width: 200,
        y: gameHeight - 400,
        height: 100
    },
    {
        x: gameWidth-200,
        width: 200,
        y: gameHeight - 200,
        height: 100
    },
]

let playerMoveSpeed = entitieSize/10;

function setupDisplayArea(){
    
    gameHeight = document.documentElement.clientHeight - 50;
    gameWidth = document.documentElement.clientWidth - 50;

    let displayElement = document.getElementById("canvasArea");
    let canvasDraw = displayElement.getContext("2d");

    displayElement.setAttribute("width",gameWidth);
    displayElement.setAttribute("height",gameHeight);

    canvasDraw.clearRect(0,0,gameWidth,gameHeight);
    canvasDraw.beginPath();
    canvasDraw.rect(0,0,gameWidth,gameHeight);
    canvasDraw.stroke();

    getServerIp();

    startGame();
}


function connectWebSocket(serverIp){

//get a websocekt connection
    // let serverIpAddress = "192.168.1.82"
    let serverIpAddress = "localhost"
    console.log("Host is",self.location.host)
    // serverConnection = new WebSocket(`ws://${serverIp}:43211`);
    // serverConnection = new WebSocket(`ws://${serverIp}:3000`); //now using the same port as the http server. will need to change this when deploying to something
    serverConnection = new WebSocket(`ws://${self.location.host}`); //now using the same port as the http server. will need to change this when deploying to something
    
    serverConnection.onopen = ()=> {
        console.log("websocket open")
        serverConnection.send(JSON.stringify({actAsDisplay:true}));
    }

    serverConnection.onmessage = (message) =>{
        let theMessage = JSON.parse(message.data);

        if(theMessage.displayId){
            let displayIdMessage = document.getElementById("displayId");
            displayIdMessage.innerHTML = theMessage.displayId;
        }
        else if(theMessage.newPlayerId){
            addPlayerEntity(theMessage.newPlayerId)
        }
        else if(! Object.keys(playerEntities).find( (key)=> {return key == theMessage.id})){
            //This might actually be a hinderance to things having the display assume unknow player is valid
            addPlayerEntity(theMessage.id)
        }
        else if(theMessage.moveRight === true){
            playerEntities[theMessage.id].moveX = playerMoveSpeed;
        }
        else if(theMessage.moveLeft === true){
            playerEntities[theMessage.id].moveX = -playerMoveSpeed;
        }
        else if(theMessage.moveRight === false){
            if (playerEntities[theMessage.id].moveX > 0){
                playerEntities[theMessage.id].moveX = 0;
            }
        }
        else if(theMessage.moveLeft === false){
            if (playerEntities[theMessage.id].moveX < 0){
                playerEntities[theMessage.id].moveX = 0;
            }
        }
        else if(theMessage.action1 === true){
            playerEntities[theMessage.id].moveY = -20;
        }
    }
}

function addPlayerEntity(player){
    //this should enforce unique ids
    let newPlayer = {
        id:player,
        x:gameWidth/2,
        // x:0,
        y:gameHeight/2,
        //y:gameHeight - entitieSize,
        moveY:0,
        moveX:0,
        width:entitieSize/4,
        height:entitieSize,
    }
    playerEntities[player] = newPlayer;

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

function startGame(){
    setInterval(gameStep,20);
}

function gameStep(){
    let displayElement = document.getElementById("canvasArea");
    let canvasDraw = displayElement.getContext("2d");

    updateEntityStates();

    refreshCanvas(canvasDraw);

    drawPlatforms(canvasDraw);

    drawEnteties(canvasDraw);
}

function refreshCanvas(canvas){
    canvas.clearRect(0,0,gameWidth,gameHeight);
    
    canvas.beginPath();
    canvas.rect(0,0,gameWidth,gameHeight);
    canvas.stroke();
}

function drawPlatforms(canvas){
    objectPlatforms.forEach((platform)=>{
        canvas.beginPath();
        canvas.rect(platform.x,platform.y,platform.width,platform.height);
        canvas.stroke();
    })

    
}

function drawEnteties(canvas){

    canvas.beginPath();    
    Object.keys(playerEntities).forEach(key => {
        let element = playerEntities[key];
        canvas.fillText(element.id,element.x,element.y)

        // canvas.rect(element.x,element.y,element.width,element.height);

        objectDrawFunctions.drawPerson(element,canvas);

    });

    Object.keys(playersDeleting).forEach(key => {

        let element = playersDeleting[key];
        objectDrawFunctions.playerDismantle(element,canvas);

    });

    canvas.stroke();
}

function onPlatform(player,platform){

    //test platform in the middle
    if(player.x+player.width < platform.x){
        return false;
    }

    if(player.x > platform.x + platform.width){
        return false;
    }

    if(player.y + player.height < platform.y){
        return false;
    }

    if(player.y > platform.y + platform.height){
        return false;
    }

    let basePoint = {x:player.width/2+player.x, y:player.y+player.height}


    if(basePoint.y <= platform.y){
        return {x:player.x,y: platform.y-player.height,collison:"y"}
    }
    if(basePoint.x + player.width/4 < platform.x){
        //left side
        return {x:platform.x - player.width,y: player.y,collison:"x"}
    }
    if(basePoint.x - player.width/4 > platform.x + platform.width){
        //right side
        return {x:platform.x + platform.width,y: player.y,collison:"x"}
    }

    

    if(basePoint.y < platform.y + platform.height){
        //catch it inside the block
        return {x:player.x,y: platform.y-player.height,collison:"y"}
    }
    else{
        let newY = (player.y > platform.y+platform.height) ? player.y : platform.y+platform.height;
        //hit from below we shall say
        return {x:player.x,y:newY,collison:"bellow"}
    }

    return false;
}

function updateEntityStates(){
    let playersShifted = [];
    Object.keys(playerEntities).map(key => {
        let element = playerEntities[key];

        element.y += element.moveY;
        element.moveY++;
        
        element.x += element.moveX;


        //this is not the best as find seems to keep going through the whole array even after finding the thing
        let platformCollision = objectPlatforms.reduce( (prev,objectPlatforms,i) => {
            let result = onPlatform(element,objectPlatforms);
            if(!prev && result){
                return result;
            }
            
            return prev;
        },false);

            
        if(platformCollision){
            if(platformCollision.collison == "y"){
                element.moveY = 0;
            }
            else if(platformCollision.collison == "bellow"){
                if(element.moveY < 0){
                    element.moveY = 0;
                }
            }
            else {
                element.moveX = 0;
            }
            //wouldalso want to set the y to be on the object
            element.y = platformCollision.y;
            element.x = platformCollision.x;
        }
        
        //seperate from the collison it sseems
        if (element.y > (gameHeight - entitieSize)){
            element.y = (gameHeight - entitieSize);
            if(element.moveY > 0){
                element.moveY = 0;
            }
        }
        else{

            // // let platformCollision = onPlatform(element,objectPlatforms);
            // if(platformCollision){
            //     if(platformCollision.collison == "y"){
            //         element.moveY = 0;
            //     }
            //     else if(platformCollision.collison == "bellow"){
            //         if(element.moveY < 0){
            //             element.moveY = 0;
            //         }
            //     }
            //     else {
            //         element.moveX = 0;
            //     }
            //     //wouldalso want to set the y to be on the object
            //     element.y = platformCollision.y;
            //     element.x = platformCollision.x;
            // }
        }

        if(element.x+element.width > gameWidth){
            playersShifted.push(key)
            serverConnection.send(JSON.stringify({shiftPlayer:key}));
        }
        if(element.x < 0){
            playersShifted.push(key)
            serverConnection.send(JSON.stringify({shiftPlayerPrevious:key}));
        }

        playerEntities[key] = element;
    });
    //need to move to work on a response from the server as following movement commands can be obtained from the server before its redireted
        //But after this has deleted it locally
    playersShifted.forEach( (keyToDelete)=>{
        playersDeleting[keyToDelete] = playerEntities[keyToDelete];
        console.log("start dismantling player ",keyToDelete)

        delete playerEntities[keyToDelete];
    })

    
    //i dont think this is the best way to delete from an object
    let playersDeletingKeys = Object.keys(playersDeleting)
    playersDeletingKeys.forEach( (key)=>{
        
        console.log("dismantling player ",key)

        if(objectDrawFunctions.isPlayerDismantled(playersDeleting[key])){
            delete playersDeleting[key];
        }
    })
}