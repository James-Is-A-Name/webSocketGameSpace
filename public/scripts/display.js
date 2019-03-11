
document.addEventListener("DOMContentLoaded",setupDisplayArea);


//THIS WHOLE THING SHOULD BE MOVED INTO A SINGLE OBJECT OR SOMETHING TO AVOID CLUTTERING UP THE GLOBAL REFERENCES
//VERY EASY FOR THIS TO TURN UGLY

// let gameThing = {
//     serverConnection: undefined
//     updateBackground: true,
//     and so on
// }

//CHANGE TO BE BETTER LAYED OUT

/*---------------------communications----------------------*/
let p2pConnectionTesting;

let serverConnection;

//store all the p2p display connections
let displayConnections = {};

//store all the p2p controller connections
let controllerConnections = {};

//will be used for determining if controller commands to this display are to be used
let controllersOnScreen = {};
/*---------------------communications----------------------*/


/*---------------------setup related things----------------------*/
let updateBackground = true;

const entitieSize = 50;

let playerMoveSpeed = entitieSize/10;

let gameHeight = document.documentElement.clientHeight - entitieSize;
let gameWidth = document.documentElement.clientWidth - entitieSize;
/*---------------------setup related things----------------------*/



/*---------------------Area alterations----------------------*/
let mouseDownLocation = undefined;
let lastMousePosition = undefined;
let mouseUpLocation = undefined;

let previousPlatformWidth;
let previousPlatformHeight;
let previousPlatformX;
let previousPlatformY;

let placePlatformsAllow = false;
/*---------------------Area alterations----------------------*/


/*---------------------game state----------------------*/
let activeDisplayId = false;

let playerEntities={};
let playersDeleting={};
//Will want to make this an object of objects not an array
    //alter elsewher eto itterate over the keys
let areaPlatforms = [];

let portals = [];
/*---------------------game state----------------------*/

function p2pConnect(whoTo){

    //create a socket thing
    let testConnection = getAWebRTC();

    //setup how to send it off
    testConnection.sendOfferFunction = ()=>{
        //Hard code who to send a message for now
        let message = {
            p2pConnect: true,
            target: whoTo,
            from: activeDisplayId,
            isADisplay: true,
            offer: testConnection.offerToSend
        }
        serverConnection.send(JSON.stringify(message))
    }

    //trigger the offer that will then trigger the send
    testConnection.createOffer()

    p2pConnectionTesting = testConnection;
}

function p2pAcceptOffer(offer,fromWho,isAController){
    //got an offer so accept it and send an answer
    
    let testConnection = getAWebRTC();

    console.log("accept an offer")
    testConnection.sendAnswerFunction = () =>{
        
        //this should have a single point of decleration so the display and controllers don't get out of sync
        let message = {
            p2pConnect: true,
            target: fromWho,
            from: activeDisplayId,
            isADisplay: true,
            answer: testConnection.answerToSend
        }
        serverConnection.send(JSON.stringify(message))
    }

    testConnection.acceptOffer(JSON.parse(offer))

    p2pConnectionTesting = testConnection;

    let send = document.getElementById("p2pSend")
    if(send){
        send.onclick = ()=>{
            p2pConnectionTesting.dataChannel.send("hello from the other side")
        }
    }

    /*-------------------TESTING--------------------------*/
    let connectionIsController = isAController;

    p2pConnectionTesting.connectionId = fromWho;

    if(connectionIsController){
        p2pConnectionTesting.handleMessage = handleControllerMessage
        
        controllerConnections[fromWho] = p2pConnectionTesting

        controllerConnections[fromWho].dataChannel.send(JSON.stringify({displayId:activeDisplayId}))
    }
    else{
        //if not in portals add it
        if(!portals.find( (portal) => portal.id == fromWho )){
            addPortal(fromWho)
            updateBackground = true;
            
            //should make this check if its already connected
            displayConnections[fromWho] = p2pConnectionTesting
        }

        p2pConnectionTesting.handleMessage = handleDisplayMessage
    }
    /*-------------------TESTING--------------------------*/
}

function p2pAcceptAnswer(answer,fromWho,isAController){
    console.log("accept an answer")
    //got an offer so accept it and send an answer
    p2pConnectionTesting.acceptAnswer(JSON.parse(answer))

    let send = document.getElementById("p2pSend")
    send.onclick = ()=>{
        p2pConnectionTesting.dataChannel.send("hello from the other side")
    }

    /*-------------------TESTING--------------------------*/

    let connectionIsController = isAController;
    // let connectionIsController = true;

    p2pConnectionTesting.connectionId = fromWho;

    if(connectionIsController){
        p2pConnectionTesting.handleMessage = handleControllerMessage
        
        controllerConnections[fromWho] = p2pConnectionTesting
    }
    else{        //if not in portals add it
        if(!portals.find( (portal) => portal.id == fromWho )){
            addPortal(fromWho)
            updateBackground = true;

            //should make this check if its already connected
            displayConnections[fromWho] = p2pConnectionTesting
        }
        p2pConnectionTesting.handleMessage = handleDisplayMessage
    }
    /*-------------------TESTING--------------------------*/
}


function updateDisplayConnections(){

    //send to all displays the current list of controllers

    //in a more planned manner do the same with the list of displays
        //tell one of two displays to connect. not both

    let connectedControllerIds = {addControllerConnections:Object.keys(controllerConnections)}

    console.log(connectedControllerIds)

    broadcastToDisplays(connectedControllerIds)
}

function broadcastToDisplays(message){
    Object.keys(displayConnections).forEach((key)=>{
        displayConnections[key].dataChannel.send(JSON.stringify(message))
    })
}

function handleDisplayMessage(message,fromWho){
    let theMessage = JSON.parse(message.data)

    console.log("the message is ",theMessage)

    if(theMessage.addConnections){
        let newConnections = theMessage.addConnections.filter((connectionToAdd)=>{
            if(activeDisplayId == connectionToAdd){
                return false;
            }
            return !(Object.keys(displayConnections).find((displayConnection)=>{
                return displayConnection == connectionToAdd;
            }))
        })

        console.log("need to add connections ",newConnections)
        //If they all try make connections i think a race condition might occur
            //try some sort of reduction thing
                //tell 1 about 2,3,4,5. 2 about 3,4,5. 3 about 4,5 and 4 about 5 
    }
    else if(theMessage.addControllerConnections){
        let newConnections = theMessage.addControllerConnections.filter((connectionToAdd)=>{
            return !(Object.keys(controllerConnections).find((connectedControllerId)=>{
                return connectedControllerId == connectionToAdd;
            }))
        })

        newConnections.forEach((connectionId)=>{
            console.log("connecting to ",connectionId)
            p2pConnect(connectionId);
        })
    }
}

function handleControllerMessage(message,fromWho){
    //very flimsy will break if not correctly formmatted as JSON 
    let theMessage = JSON.parse(message.data)


    if(playerEntities[fromWho]){
        if(theMessage.moveRight === true){
            playerEntities[fromWho].moveX = playerMoveSpeed;
            playerEntities[fromWho].moveRight = theMessage.moveRight;
        }
        else if(theMessage.moveLeft === true){
            playerEntities[fromWho].moveX = -playerMoveSpeed;
            playerEntities[fromWho].moveLeft = theMessage.moveLeft;
        }
        else if(theMessage.moveRight === false){
            if (playerEntities[fromWho].moveX > 0){
                playerEntities[fromWho].moveX = 0;
                if(playerEntities[fromWho].moveLeft){
                    playerEntities[fromWho].moveX = -playerMoveSpeed;
                }
            }
            playerEntities[fromWho].moveRight = theMessage.moveRight;
        }
        else if(theMessage.moveLeft === false){
            if (playerEntities[fromWho].moveX < 0){
                playerEntities[fromWho].moveX = 0;

                if(playerEntities[fromWho].moveRight){
                    playerEntities[fromWho].moveX = playerMoveSpeed;
                }
            }
            playerEntities[fromWho].moveLeft = theMessage.moveLeft;
        }
        else if(theMessage.action1 === true){
            playerEntities[fromWho].moveY = -20;
        }
        else if(theMessage.whoAreYou){
            controllerConnections[fromWho].dataChannel.send(JSON.stringify({displayId:activeDisplayId}))
        }
    }
}

function swapMenuContent(show){
    let menuSection = document.getElementById("menuSection")

    let newContent = undefined;
    //I dont like this magic number use here. feels icky
        //also i screws up when formatting the html with line breaks as they are not drawn but count as text elements of a div
    let oldContent = menuSection.childNodes[0];
    

    if(show){
        newContent = document.createElement("div");
        
        let newButton = document.createElement("button");
        newButton.title = "Hide Menu";
        newButton.innerHTML = newButton.title;
        newButton.onclick = () => {swapMenuContent(false)};
        newButton.style.width = "50%"
        newButton.style.height = "100%"

        let newTitle = document.createElement("h1")
        newTitle.innerHTML = "MENU STUFF"

        let platformDrawButton = document.createElement("button")
        
        if(placePlatformsAllow){
            platformDrawButton.innerHTML = "platform draw enabled"
        }
        else{
            platformDrawButton.innerHTML = "platform draw disabled"
        }

        platformDrawButton.onclick = () => {

            //As it will be toggled
            if(!placePlatformsAllow){
                platformDrawButton.innerHTML = "platform draw enabled"
            }
            else{
                platformDrawButton.innerHTML = "platform draw disabled"
            }
            setNewPlatformDraw(!placePlatformsAllow);
        }

        /*-------------------TESTING--------------------------*/

        let p2pTargetForm = document.createElement("form");
        p2pTargetForm.onsubmit = (event)=>{
            event.preventDefault();

            let value = document.getElementById("connectionTarget").value;
            if(!isNaN(parseInt(value))){
                p2pConnect(parseInt(value))
            }
        }
        let p2pTarget = document.createElement("input");
        p2pTarget.type = "text";
        p2pTarget.id = "connectionTarget";

        p2pTargetForm.appendChild(p2pTarget);
        
        let p2pSend = document.createElement("button")
        p2pSend.innerHTML = "p2p say hello"
        p2pSend.id = "p2pSend"
        /*-------------------TESTING--------------------------*/

        newContent.appendChild(newButton)
        newContent.appendChild(platformDrawButton)
        
        /*-------------------TESTING--------------------------*/
        newContent.appendChild(p2pTargetForm)
        newContent.appendChild(p2pSend)
        /*-------------------TESTING--------------------------*/
        
        newContent.appendChild(newTitle)

        menuSection.replaceChild(newContent,oldContent);

        
        /*-------------------TESTING--------------------------*/
        let send = document.getElementById("p2pSend")
        send.onclick = ()=>{
            p2pConnectionTesting.dataChannel.send("hello from the other side")
        }
        /*-------------------TESTING--------------------------*/
    }
    else{

        let newButton = document.createElement("button");
        newButton.title = "Options menu";
        newButton.innerHTML = newButton.title;
        newButton.onclick = () => {swapMenuContent(true)};
        newButton.style.width = "50%"
        newButton.style.height = "100%"

        menuSection.replaceChild(newButton,oldContent);
    }
}

function setNewPlatformDraw(allow){
    //the == true is to enforce true or false incase a non boolean option is given
        //at least that is the intention
    placePlatformsAllow = (allow == true);
}
function addNewPlatform(x,y,width,height){
    if(placePlatformsAllow){

        //Should proabaly verify the values as being valid
        areaPlatforms.push({
            x,
            y,
            width,
            height
        }); 
        
        updateBackground = true;
    }
}

function setupDisplayArea(){
    
    gameHeight = document.documentElement.clientHeight - 50;
    gameWidth = document.documentElement.clientWidth - 50;
    
    let displayElementBackground = document.getElementById("canvasArea");
    let canvasDrawBackground = displayElementBackground.getContext("2d");

    let displayElement = document.getElementById("canvasAreaFront");
    let canvasDraw = displayElement.getContext("2d");

    displayElementBackground.setAttribute("width",gameWidth);
    displayElementBackground.setAttribute("height",gameHeight);
    displayElement.setAttribute("width",gameWidth);
    displayElement.setAttribute("height",gameHeight);

    canvasDrawBackground.clearRect(0,0,gameWidth,gameHeight);

    refreshCanvas(canvasDraw)
    // canvasDraw.clearRect(0,0,gameWidth,gameHeight);
    // canvasDraw.beginPath();
    // canvasDraw.rect(0,0,gameWidth,gameHeight);
    // canvasDraw.stroke();

    connectWebSocket();

    startGame();
}


function connectWebSocket(){
    serverConnection = new WebSocket(`ws://${self.location.host}`);
    
    serverConnection.onopen = ()=> {
        console.log("websocket open")
        serverConnection.send(JSON.stringify({actAsDisplay:true}));
    }

    serverConnection.onmessage = (message) =>{
        let theMessage = JSON.parse(message.data);

        if(theMessage.displayId){
            let displayIdMessage = document.getElementById("displayId");
            displayIdMessage.innerHTML = theMessage.displayId;

            activeDisplayId = theMessage.displayId
        }
        /*----------------------Testing-----------------------------*/
        else if(theMessage.p2pConnect){

            if(theMessage.answer){
                p2pAcceptAnswer(theMessage.answer,theMessage.from,!theMessage.isADisplay)
            }
            else if(theMessage.offer){
                p2pAcceptOffer(theMessage.offer,theMessage.from,!theMessage.isADisplay)
            }
        }
        /*----------------------Testing-----------------------------*/
        else if(theMessage.newDisplay){

            // addPortal(theMessage.id)

            // updateBackground = true;
        }
        else if(theMessage.newPlayerId){
            addPlayerEntity(theMessage.newPlayerId)
        }
        else if(! Object.keys(playerEntities).find( (key)=> {return key == theMessage.id})){
            //This might actually be a hinderance to things having the display assume unknow player is valid
            addPlayerEntity(theMessage.id)
        }
    }
}

function addPortal(displayId){
    portals.push({
        x: 100*(portals.length + 1),
        y: 100,
        destination: displayId
    })
}

function addPlayerEntity(player){
    //this should enforce unique ids
    let newPlayer = {
        id:player,
        x:gameWidth/2,
        y:gameHeight/2,
        moveY:0,
        moveX:0,
        width:entitieSize/4,
        height:entitieSize,
    }
    playerEntities[player] = newPlayer;

}

function startGame(){

    setupMouseClicks()

    setInterval(gameStep,20);
}

//This wont work on mobiles. consider using pointer up down events.
    //ios might require touchstart/touchStop
function setupMouseClicks(){
    
    let displayElement = document.getElementById("canvasAreaFront");
    //displayElement.addEventListener("mousedown",mouseDownHandle)
    //displayElement.addEventListener("mousemove",mouseMoveHandle)
    //displayElement.addEventListener("mouseup",mouseUpHandle)

    displayElement.addEventListener("mousedown",(evt)=>{
        mouseDownLocation = {x:evt.clientX,y:evt.clientY}
    })
    //
    displayElement.addEventListener("mousemove",(evt)=>{

        //use this to draw a demo square        
        mouseUpLocation = {x:evt.clientX,y:evt.clientY}
    })
    displayElement.addEventListener("mouseup",(evt)=>{
        
        //if screenX is used it grabs the location in relation to the monitor
        mouseUpLocation = {x:evt.clientX,y:evt.clientY}

        if(mouseDownLocation != undefined){

            let platformX = (mouseDownLocation.x < mouseUpLocation.x) ? mouseDownLocation.x : mouseUpLocation.x;
            let platformY = (mouseDownLocation.y < mouseUpLocation.y) ? mouseDownLocation.y : mouseUpLocation.y;

            //Need to figure out proper offset. this isnt quite right
                //Got it. needs the whole hirachy of the dom to the canvas object. its offset is relative to its parent. click is based on the overall location on the window
            let topDiv = document.getElementById("topDiv")
            platformX -= displayElement.offsetLeft + topDiv.offsetLeft;
            platformY -= displayElement.offsetTop + topDiv.offsetTop;

            let platformWidth = Math.abs(mouseDownLocation.x - mouseUpLocation.x);
            let platformHeight = Math.abs(mouseDownLocation.y - mouseUpLocation.y);

            let newPlatform = {
                x:platformX,
                y:platformY,
                width:platformWidth,
                height:platformHeight,
            }
            
            mouseDownLocation = undefined
            mouseUpLocation = undefined
            
            //probably easier to just pass the object really. but already done this
            addNewPlatform(newPlatform.x,newPlatform.y,newPlatform.width,newPlatform.height);
            // areaPlatforms.push(newPlatform);
        }
    })
}

function gameStep(){
    let displayElementBackground = document.getElementById("canvasArea");
    let canvasDrawBackground = displayElementBackground.getContext("2d");
    
    let displayElement = document.getElementById("canvasAreaFront");
    let canvasDraw = displayElement.getContext("2d");

    
    //Must be done before the entities are moved
    clearOldEntities(canvasDraw);
    updateEntityStates();

    if(updateBackground){
        updateBackground = false;
        refreshCanvas(canvasDrawBackground);
        drawPlatforms(canvasDrawBackground);
        drawPortals(canvasDrawBackground);
    }

    // refreshCanvas(canvasDraw);
    //Alter to just claer where things have been drawn rather than the whole thing
    drawEnteties(canvasDraw);
    drawVisualAdditions(canvasDraw);
}

function refreshCanvas(canvas){
    canvas.clearRect(0,0,gameWidth,gameHeight);
    
    canvas.beginPath();
    canvas.rect(0,0,gameWidth,gameHeight);
    canvas.stroke();

    //objectDrawFunctions.clearCanvas(width,height,canvas)
}

//For drawing things that ddont interact like the example platform square or drag and drop location of things
function drawVisualAdditions(canvas){

    if(mouseUpLocation && mouseDownLocation && placePlatformsAllow){
        
        //is straight copied from the mouse event part so very much a candidate for refactoring
        let platformX = (mouseDownLocation.x < mouseUpLocation.x) ? mouseDownLocation.x : mouseUpLocation.x;
        let platformY = (mouseDownLocation.y < mouseUpLocation.y) ? mouseDownLocation.y : mouseUpLocation.y;

        let displayElement = document.getElementById("canvasArea");
        let topDiv = document.getElementById("topDiv")
        platformX -= displayElement.offsetLeft + topDiv.offsetLeft;
        platformY -= displayElement.offsetTop + topDiv.offsetTop;

        let platformWidth = Math.abs(mouseDownLocation.x - mouseUpLocation.x);
        let platformHeight = Math.abs(mouseDownLocation.y - mouseUpLocation.y);

        if(previousPlatformWidth){
            // canvas.clearRect(previousPlatformX-2,previousPlatformY-2,previousPlatformWidth+4,previousPlatformHeight+4)
            let previousPlatform = {
                x:previousPlatformX,
                y:previousPlatformY,
                width:previousPlatformWidth,
                height:previousPlatformHeight
            }
            objectDrawFunctions.clearPlatform(previousPlatform,canvas)
        }
        let platform = {
            x:platformX,
            y:platformY,
            width:platformWidth,
            height:platformHeight
        }
        previousPlatformX = platformX
        previousPlatformY = platformY
        previousPlatformWidth = platformWidth
        previousPlatformHeight = platformHeight
        
        objectDrawFunctions.drawPlatform(platform,canvas)
    }
}

function drawPlatforms(canvas){
    areaPlatforms.forEach((platform)=>{
        objectDrawFunctions.drawPlatform(platform,canvas)
    })
}

function drawPortals(canvas){
    portals.forEach((portal) => {
        objectDrawFunctions.drawPortal(portal,canvas)
    })
}

function clearOldEntities(canvas){
    Object.keys(playerEntities).forEach(key => {
        let element = playerEntities[key];
        objectDrawFunctions.clearPlayerObject(element,canvas);
    });
    
    Object.keys(playersDeleting).forEach(key => {
        let element = playersDeleting[key];
        objectDrawFunctions.clearPlayerObject(element,canvas);
    });
}
function drawEnteties(canvas){

    canvas.beginPath();    

    Object.keys(playerEntities).forEach(key => {
        let element = playerEntities[key];

        // canvas.fillText(element.id,element.x,element.y)
        objectDrawFunctions.drawPerson(element,canvas);
    });

    Object.keys(playersDeleting).forEach(key => {
        let element = playersDeleting[key];
        objectDrawFunctions.playerDismantle(element,canvas);
    });

    canvas.stroke();
}

function onPlatform(player,platform){

    if((player.x+player.width < platform.x) || (player.x > platform.x + platform.width) || (player.y + player.height < platform.y) || (player.y > platform.y + platform.height) ){
        return false;
    }

    let basePoint = {x:player.width/2+player.x, y:player.y+player.height}

    if(basePoint.y <= platform.y){
        return {x:player.x,y: platform.y-player.height,collison:"y"}
    }
    else if(basePoint.x < platform.x){   //left side
        return {x:platform.x - player.width,y: player.y,collison:"x"}
    }
    else if(basePoint.x > platform.x + platform.width){  //right side
        return {x:platform.x + platform.width,y: player.y,collison:"x"}
    }
    else if(basePoint.y < platform.y + platform.height){ //catch it inside the block
        return {x:player.x,y: platform.y-player.height,collison:"y"}
    }
    else{   //hit from below we shall say
        let newY = (player.y > platform.y+platform.height) ? player.y : platform.y+platform.height;
        return {x:player.x,y:newY,collison:"bellow"}
    }
}

function updateEntityStates(){
    let playersShifted = [];

    Object.keys(playerEntities).map(playerIndex => {
        let playerObject = playerEntities[playerIndex];

        playerObject = playerMovements(playerObject);

        let platformCollisions = getPlatformCollisions(playerObject);
            
        if(platformCollisions.length > 0){
            playerObject = platformCollisionsAction(platformCollisions,playerObject)
        }
        else{
            playerObject = playerMovementCheck(playerObject)
        }

        //seperate from the collison it sseems
        playerObject = playerGroundDetectionAction(playerObject)
        
        //very similar things
        if(displaySideCollision(playersShifted,playerObject,playerIndex) || portalCollisons(playersShifted,playerObject,playerIndex)) {
            playersShifted.push(playerIndex)
        }
        playerEntities[playerIndex] = playerObject;
    });

    //playerRemoval()   //could logically combine the two
    playerDeletingAction(playersShifted)
    playerDismantlingAction()
}

function playerMovements(playerObject){
    playerObject.y += playerObject.moveY;
    playerObject.moveY++;
    
    playerObject.x += playerObject.moveX;

    return playerObject
}


function getPlatformCollisions(playerObject){
    return areaPlatforms.reduce( (prev,platform,i) => {
        let result = onPlatform(playerObject,platform);
        if(result){
            prev.push(result)
        }
        return prev;
    },[]);
}

//seperate from the collison it sseems
function playerGroundDetectionAction(playerObject){
    if (playerObject.y > (gameHeight - entitieSize)){
        playerObject.y = (gameHeight - entitieSize);
        if(playerObject.moveY > 0){
            playerObject.moveY = 0;
        }
    }
    return playerObject;
}

function playerMovementCheck(playerObject){
    if(playerObject.moveRight && playerObject.moveX == 0){
        playerObject.moveX = playerMoveSpeed;
    }
    else if(playerObject.moveLeft && playerObject.moveX == 0){
        playerObject.moveX = -playerMoveSpeed;
    }
    return playerObject;
}

function platformCollisionsAction(platformCollisions,playerObject){
    platformCollisions.forEach((platformCollision)=>{
        if(platformCollision.collison == "y"){
            playerObject.y = platformCollision.y;
            playerObject.moveY = 0;
        }
        else if(platformCollision.collison == "x"){
            playerObject.x = platformCollision.x;
            playerObject.moveX = 0;
        }
        else if(platformCollision.collison == "bellow"){
            if(playerObject.moveY < 0){
                playerObject.moveY = 0;
            }
        }
    })
    return playerObject;
}

function displaySideCollision(playersShifted,playerObject,playerIndex){

    if(playerObject.x+playerObject.width > gameWidth){
        serverConnection.send(JSON.stringify({shiftPlayer:playerIndex}));
        return true
    }
    else if(playerObject.x < 0){
        serverConnection.send(JSON.stringify({shiftPlayerPrevious:playerIndex}));
        return true
    }
    return false
}

function portalCollisons(playersShifted,playerObject,playerIndex){
    let portalCollision = portals.find((portal) => {
        if(( Math.abs(playerObject.x + playerObject.width/2 - portal.x) < 20) && (Math.abs(playerObject.y + playerObject.height/2 - portal.y) < 20 )){
            if(!playersShifted.find( player => player == playerIndex)){
                return true;
            }
        }
    })

    if(portalCollision){
        //previously doing this but not a great way of doing it
        // playersShifted.push(key)
        //This should be elsewhere really
        serverConnection.send(JSON.stringify({shiftPlayerDirect:playerIndex,targetDisplay:portalCollision.destination}));
        
        controllerConnections[playerIndex].dataChannel.send(JSON.stringify({shiftDisplay:portalCollision.destination}))

        return true
    }
    return false
}

function playerDeletingAction(playersShifted){
    playersShifted.forEach( (keyToDelete)=>{
        playersDeleting[keyToDelete] = playerEntities[keyToDelete];
        delete playerEntities[keyToDelete];
    })
}

function playerDismantlingAction(){
    //still dont think im doing this is a good way
    let playersDeletingKeys = Object.keys(playersDeleting)
    playersDeletingKeys.forEach( (key)=>{
        if(objectDrawFunctions.isPlayerDismantled(playersDeleting[key])){
            delete playersDeleting[key];
        }
    })
}