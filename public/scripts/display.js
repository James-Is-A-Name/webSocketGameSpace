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

let displayConnections = {}; //store all the p2p display connections

let controllerConnections = {}; //store all the p2p controller connections

let controllersOnScreen = {}; //will be used for determining if controller commands to this display are to be used
// let communitcations = {
//     server,
//     displays,
//     controllers
// }
/*---------------------communications----------------------*/

/*---------------------setup related things----------------------*/
let updateBackground = true;

const entitieSize = 50;

let playerMoveSpeed = entitieSize/10;

let gameHeight = document.documentElement.clientHeight - entitieSize;
let gameWidth = document.documentElement.clientWidth - entitieSize;

// let gameDetails = {
//     entitieSize: 50,
//     moveSpeed: 5,
//     height:
//     width: 
// }
/*---------------------setup related things----------------------*/



/*---------------------interaction engine----------------------*/
const physActions = new ObjectInteractions()
/*---------------------interaction engine----------------------*/


/*---------------------Area alterations----------------------*/
let mouseDownLocation = undefined;
let lastMousePosition = undefined;
let mouseUpLocation = undefined;

// let previousPlatform = undefined
let previousPlatformWidth;
let previousPlatformHeight;
let previousPlatformX;
let previousPlatformY;

//More of a menu option really
let placePlatformsAllow = false;
/*---------------------Area alterations----------------------*/

/*---------------------game state----------------------*/
let activeDisplayId = false;

// let gameElelemtns = {
//     playerElements:{
//         playersRespawn:{},
//         playerEntities:{},
//         playersDeleting
//     },
//     enviromentElements:{
//         areaPlatforms:{},
//         portals:{}
//     }
// } 
let playersRespawn = {}; //This is really just a temporary way of doing this. could be better acheived

let playerEntities = {};
let playersDeleting = {};
//Will want to make this an object of objects not an array
    //alter elsewher eto itterate over the keys
let areaPlatforms = [];
let portals = [];
/*---------------------game state----------------------*/


/* ---------------------- MOVE TO connections             -------------------------------*/
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

/* ---------------------- MOVE TO connections             -------------------------------*/
function p2pAcceptOffer(offer,fromWho,isAController){ //got an offer so accept it and send an answer
    
    let testConnection = getAWebRTC();

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

    let connectionIsController = isAController;

    p2pConnectionTesting.connectionId = fromWho;

    if(connectionIsController){
        p2pConnectionTesting.handleMessage = handleControllerMessage
        
        controllerConnections[fromWho] = p2pConnectionTesting
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
}

/* ---------------------- MOVE TO connections             -------------------------------*/
function p2pAcceptAnswer(answer,fromWho,isAController){
    console.log("accept an answer")
    //got an offer so accept it and send an answer
    p2pConnectionTesting.acceptAnswer(JSON.parse(answer))

    let connectionIsController = isAController;

    p2pConnectionTesting.connectionId = fromWho;

    p2pConnectionTesting.dataChannelSetupCallback = ()=>{
        //POSSIBLE LOOP ISSUES HERE IF NOT THOUGHT ABOUT PROPERLY
        //INTIAL TESTING HAPPENING
            //dosent seem to loop too much but might be different
            //possibly will loop when trying to connect to a new controller that isnt active. not entierly sure it will but it might
        updateDisplayConnections()
    }

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
}

/* ---------------------- MOVE TO connections             -------------------------------*/
function updateDisplayConnections(){

    //send to all displays the current list of controllers

    //in a more planned manner do the same with the list of displays
        //tell one of two displays to connect. not both

    let connectedControllerIds = {addControllerConnections:Object.keys(controllerConnections)}

    console.log(connectedControllerIds)

    broadcastToDisplays(connectedControllerIds)
}

/* ---------------------- MOVE TO connections             -------------------------------*/
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
    else if(theMessage.shiftedPlayer){
        addPlayerEntity(theMessage.shiftedPlayer)
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
        else if(theMessage.action2 === true){
            if(playerEntities[fromWho].stance == 0){
                playerEntities[fromWho].stance = 1;
            }
            else if(playerEntities[fromWho].stance == 1){
                playerEntities[fromWho].stance = 2;
            }
            else{
                playerEntities[fromWho].stance = 0;
            }
        }
        else if(theMessage.whoAreYou){
            controllerConnections[fromWho].dataChannel.send(JSON.stringify({displayId:activeDisplayId}))
        }
    }
    else if(theMessage.joinAsNewController){
        console.log("got request from controller to act as a player")
        addPlayerEntity(fromWho);
    }
}

/* ---------------------- sort out a better way of doing this    -------------------------------*/
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

        newContent.appendChild(newButton)
        newContent.appendChild(platformDrawButton)
        
        newContent.appendChild(p2pTargetForm)
        
        newContent.appendChild(newTitle)

        menuSection.replaceChild(newContent,oldContent);

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

    objectDrawFunctions.refreshCanvas(canvasDraw,gameWidth,gameHeight)

    connectWebSocket();

    startGame();
}

function connectWebSocket(){
    serverConnection = new WebSocket(`ws://${self.location.host}`);
    
    serverConnection.onopen = ()=> {

        //not sure 
        // console.log("websocket open")
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
            // addPlayerEntity(theMessage.newPlayerId)
        }
        else if(! Object.keys(playerEntities).find( (key)=> {return key == theMessage.id})){
            //This might actually be a hinderance to things having the display assume unknow player is valid
            // addPlayerEntity(theMessage.id)
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
        // stance: 0
        stance: Math.floor(Math.random()*3)
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
        objectDrawFunctions.refreshCanvas(canvasDrawBackground,gameWidth,gameHeight);
        objectDrawFunctions.drawPlatforms(canvasDrawBackground,areaPlatforms);
        objectDrawFunctions.drawPortals(canvasDrawBackground,portals);
    }

    drawEnteties(canvasDraw);
    drawVisualAdditions(canvasDraw);
}


/* ---------------------- maybe MOVE TO ObjectDraw       -------------------------------*/
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

        // let platform = {}
        // let displayElement = document.getElementById("canvasArea");
        // let topDiv = document.getElementById("topDiv")
        // platform.x = ((mouseDownLocation.x < mouseUpLocation.x) ? mouseDownLocation.x : mouseUpLocation.x) - displayElement.offsetLeft + topDiv.offsetLeft;
        // platform.y = ((mouseDownLocation.y < mouseUpLocation.y) ? mouseDownLocation.y : mouseUpLocation.y) - displayElement.offsetTop + topDiv.offsetTop;
        // platform.width = Math.abs(mouseDownLocation.x - mouseUpLocation.x);
        // platform.height = Math.abs(mouseDownLocation.y - mouseUpLocation.y);
        // if(previewPlatform){
        //     objectDrawFunctions.clearPlatform(previewPlatform,canvas)
        // }
        // previewPlatform = platform
        // objectDrawFunctions.drawPlatform(platform,canvas)
        
        let platformWidth = Math.abs(mouseDownLocation.x - mouseUpLocation.x);
        let platformHeight = Math.abs(mouseDownLocation.y - mouseUpLocation.y);

        if(previousPlatformWidth){
            
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

function clearOldEntities(canvas){
    Object.keys(playerEntities).forEach(key => {
        let element = playerEntities[key];
        objectDrawFunctions.clearPlayerObject(element,canvas);
    });
    
    Object.keys(playersDeleting).forEach(key => {
        let element = playersDeleting[key];
        objectDrawFunctions.clearPlayerObject(element,canvas);
    });
    
    Object.keys(playersRespawn).forEach(key => {
        let element = playersRespawn[key];
        objectDrawFunctions.clearPlayerObject(element,canvas);
    });
}
function drawEnteties(canvas){

    Object.keys(playerEntities).forEach(key => {
        let element = playerEntities[key];
        objectDrawFunctions.drawPerson(element,canvas);
    });

    Object.keys(playersDeleting).forEach(key => {
        let element = playersDeleting[key];
        objectDrawFunctions.playerDismantle(element,canvas);
    });
    
    Object.keys(playersRespawn).forEach(key => {
        let element = playersRespawn[key];
        objectDrawFunctions.playerDismantle(element,canvas);
    });
}

function updateEntityStates(){
    let playersShifted = [];
    let playersDefeated = [];

    Object.keys(playerEntities).map(playerIndex => {
        let playerObject = playerEntities[playerIndex];

        playerObject = physActions.playerMovements(playerObject);

        let platformCollisions = physActions.getPlatformCollisions(playerObject,areaPlatforms);
            
        if(platformCollisions.length > 0){
            playerObject = physActions.platformCollisionsAction(platformCollisions,playerObject)
        }
        else{
            playerObject = physActions.playerMovementCheck(playerObject,playerMoveSpeed)
        }

        playerObject = physActions.playerGroundDetectionAction(playerObject,gameHeight)
        
        // if(displaySideCollision(playersShifted,playerObject,playerIndex) || portalCollisions(playersShifted,playerObject,playerIndex)) {
        //remove side collisions causing shifts for now
        playerObject = physActions.displaySideCollisionNoShift(playerObject,gameWidth)

        let portalCollision = physActions.portalCollisions(playerObject,portals)
        let playerBattles = physActions.checkPlayerInteractions(playerObject,playerEntities)
        

        if(portalCollision){
            //send off controller to other display
            controllerConnections[playerIndex].dataChannel.send(JSON.stringify({shiftDisplay:portalCollision.destination}))
            displayConnections[portalCollision.destination].dataChannel.send(JSON.stringify({shiftedPlayer:playerIndex}))
            
            if(!playersShifted.find( player => player == playerObject.id)){
                playersShifted.push(playerObject.id)
            }
        }
        else if(playerBattles) {
            console.log("player "+playerObject.id+" defeated");
            playersDefeated.push(playerObject.id)
        }

        playerEntities[playerIndex] = playerObject;
    });

    //playerRemoval()   //could logically combine the two
    playerDeletingAction(playersShifted)
    playerDismantlingAction()

    playerDefeatedSwitch(playersDefeated)
    playerDefeatedAnimate()
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

function playerDefeatedSwitch(playersDefeated){
    //Alternative is to give the objects a 
    playersDefeated.forEach( (keyToMove)=>{
        playersRespawn[keyToMove] = playerEntities[keyToMove];
        delete playerEntities[keyToMove];
    })
}

function playerDefeatedAnimate(){
    let playersRespawningKeys = Object.keys(playersRespawn)
    playersRespawningKeys.forEach( (key)=>{
        if(objectDrawFunctions.isPlayerDismantled(playersRespawn[key])){
            addPlayerEntity(key)
            delete playersRespawn[key];
        }   
    })
}