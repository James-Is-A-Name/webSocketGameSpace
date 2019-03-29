

//Alter this to call a seperate function that sets a global object of the gamestate
    //or have this done in the top file and have it decide the draw and inter objects interations code
document.addEventListener("DOMContentLoaded",setupDisplayArea);

//THIS WHOLE THING SHOULD BE MOVED INTO A SINGLE OBJECT OR SOMETHING TO AVOID CLUTTERING UP THE GLOBAL REFERENCES
//VERY EASY FOR THIS TO TURN UGLY

class gameDisplay{
    constructor(){
 
        //Have some sort on inclusion of the phys and draw JS file things
        //physEngine = //possibly passed into the constructor from the main html so the logic of joining things can be sorted in a singular top place
        //drawEngine = //same as ^


        let canvasBackElement = document.getElementById("canvasArea");
        let canvasBack = canvasBackElement.getContext("2d");

        let canvasFrontElement = document.getElementById("canvasAreaFront");
        let canvasFront = canvasFrontElement.getContext("2d");
        //might be better than constantly re referening the same thing that shouldn't really be swapped out for a different one
        this.canvas = {
            front: canvasFront,
            back: canvasBack
        }
        

        this.comms = {
            
            //controllersOnScreen = {}, //could be used for determining if controller commands to this display are to be used.
            
            p2pConnections = {}, //Have all connections in one object but have them flag what they are after connecting
            // {
            //     status: "connected"; // or pending or disconnected
            //     connection: null; //the connection object
            //     type: "pending"; //the type of thing it is e.g. controller, display, other? pending for not yet known, might have it as null instead
            // }
            //Will require the message handling to be the same for all then determine things based off what the connection type is

            //Will be replaced with functions that obtain these from the main list
            serverConnection: {},
            displayConnections: {},
            controllerConnections: {},
            pendingConnections: {},
        }

        this.game = {
            activeDisplayId : false,

            playersRespawn : {}, //This is really just a temporary way of doing this. could be better acheived

            playerEntities : {},
            playersDeleting : {},
            
            //should probably make these objects like the others
            areaPlatforms : [],
            portals : [],

            playerScores: {},
        }

        this.gameConstansts = {
            entitySize: 50,
            playerMoveSpeed: 5,
            gameHeight: 0,
            gameWidth: 0,

        }

        this.displayDetails = {
            leftDisplay: null,
            rightDisplay: null,
        }

        this.rendering = {
            updateBackground: true,
        }

        this.mouse = {

            downLocation : null,
            lastPosition : null,
            upLocation : null,
        }

        this.menuOptions = {
            previewPlatform : null,
            placePlatformsAllow : false,
            portalMoveAllow : false,
            portalToMove : -1,
        }
    }
}

//it was still working without this being declared globaly somehow
let p2pConnectionTesting = null;

/*---------------------interaction engine----------------------*/
const physActions = new ObjectInteractions()
/*---------------------interaction engine----------------------*/

//needs to sort stuff out else where
let g;

/* ---------------------- MOVE TO connections             -------------------------------*/
function p2pConnect(whoTo,displayId,serverConnection){

    //create a socket thing
    let connection = getAWebRTC();

    //setup how to send it off
    connection.sendOfferFunction = ()=>{
        //Hard code who to send a message for now
        let message = {
            p2pConnect: true,
            target: whoTo,
            from: displayId,
            isADisplay: true,
            offer: connection.offerToSend
        }
        serverConnection.send(JSON.stringify(message))
        
    }

    //trigger the offer that will then trigger the send
    connection.createOffer()

    //This will probably just be removed
    //will change to this then move it out of the function
    g.comms.p2pConnections[whoTo].connection = connection;
    g.comms.p2pConnections[whoTo].type = "pending";
    g.comms.p2pConnections[whoTo].status = "pending";

    return connection;
}

/* ---------------------- MOVE TO connections             -------------------------------*/
function p2pAcceptOffer(offer,fromWho,isAController){ //got an offer so accept it and send an answer
    // function p2pAcceptOffer(offer,fromWho,isAController,displayId,serverConnection){
    
    let connection = getAWebRTC();

    connection.sendAnswerFunction = () =>{
        
        //this should have a single point of decleration so the display and controllers don't get out of sync
        let message = {
            p2pConnect: true,
            target: fromWho,
            from: g.game.activeDisplayId,
            isADisplay: true,
            answer: connection.answerToSend
        }
        g.comms.serverConnection.send(JSON.stringify(message))
    }

    connection.acceptOffer(JSON.parse(offer))
    
    connection.dataChannelSetupCallback = ()=>{
        //POSSIBLE LOOP ISSUES HERE IF NOT THOUGHT ABOUT PROPERLY
        //INTIAL TESTING HAPPENING
            //dosent seem to loop too much but might be different
            //possibly will loop when trying to connect to a new controller that isnt active. not entierly sure it will but it might
        updateDisplayConnections()
    }

    let connectionIsController = isAController;

    connection.connectionId = fromWho;

    if(connectionIsController){
        connection.handleMessage = handleControllerMessage
        
        g.comms.controllerConnections[fromWho] = connection

        //will change to this then move it out of the function
        g.comms.p2pConnections[fromWho].connection = connection;
        g.comms.p2pConnections[fromWho].type = "controller";
        g.comms.p2pConnections[fromWho].status = "pending";
    }
    else{
        //if not in portals add it
        if(!g.game.portals.find( (portal) => portal.id == fromWho )){
            addPortal(fromWho)
            g.rendering.updateBackground = true;
            
            //should make this check if its already connected
            g.comms.displayConnections[fromWho] = connection

            
            //will change to this then move it out of the function
            g.comms.p2pConnections[fromWho].connection = connection;
            g.comms.p2pConnections[fromWho].type = "display";
            g.comms.p2pConnections[fromWho].status = "pending";
        }

        connection.handleMessage = handleDisplayMessage
    }
}

/* ---------------------- MOVE TO connections             -------------------------------*/
function p2pAcceptAnswer(answer,fromWho,isAController){

    console.log("accept an answer from ",fromWho)
    //got an offer so accept it and send an answer

    
    let connectionInstance = g.comms.pendingConnections[fromWho]
    //quick check to confirm connection exists 
    if(!connectionInstance){
        return;
    }

    connectionInstance.acceptAnswer(JSON.parse(answer))

    let connectionIsController = isAController;

    connectionInstance.connectionId = fromWho;

    connectionInstance.dataChannelSetupCallback = ()=>{
        //POSSIBLE LOOP ISSUES HERE IF NOT THOUGHT ABOUT PROPERLY
        //INTIAL TESTING HAPPENING
            //dosent seem to loop too much but might be different
            //possibly will loop when trying to connect to a new controller that isnt active. not entierly sure it will but it might
        updateDisplayConnections()
    }

    if(connectionIsController){
        connectionInstance.handleMessage = handleControllerMessage
        
        g.comms.controllerConnections[fromWho] = connectionInstance

    }
    else{        //if not in portals add it
        if(!g.game.portals.find( (portal) => portal.id == fromWho )){
            addPortal(fromWho)
            g.rendering.updateBackground = true;

            //should make this check if its already connected
            g.comms.displayConnections[fromWho] = connectionInstance

            g.comms.p2pConnections[fromWho].connection = connection;
            g.comms.p2pConnections[fromWho].type = "display";
            g.comms.p2pConnections[fromWho].status = "pending";
        }
        connectionInstance.handleMessage = handleDisplayMessage
    }
}

/* ---------------------- MOVE TO connections             -------------------------------*/
function updateDisplayConnections(){

    //send to all displays the current list of controllers

    //in a more planned manner do the same with the list of displays
        //tell one of two displays to connect. not both

    let connectedControllerIds = {addControllerConnections:Object.keys(g.comms.controllerConnections)}

    console.log(connectedControllerIds)

    broadcastToDisplays(connectedControllerIds)
}

/* ---------------------- MOVE TO connections             -------------------------------*/
function broadcastToDisplays(message){

    let dusplayConnections = Object.keys(g.comms.p2pConnections).filter((connectionInfo)=>{
        return connectionInfo.type == "display" && connectionInfo.status == "connected";
    })

    dusplayConnections.forEach((key)=>{
        g.comms.p2pConnections[key].channel.dataChannel.send(JSON.stringify(message))
    })
    // Object.keys(g.comms.displayConnections).forEach((key)=>{
    //     g.comms.displayConnections[key].dataChannel.send(JSON.stringify(message))
    // })
}

function handleDisplayMessage(message,fromWho){
    let theMessage = JSON.parse(message.data)

    if(theMessage.addConnections){
        let newConnections = theMessage.addConnections.filter((connectionToAdd)=>{
            if(g.game.activeDisplayId == connectionToAdd){
                return false;
            }


            return !(Object.keys(g.comms.p2pConnections).filter((con)=>(con.type == "display" && con.status == "connected"))
            .find((displayConnection)=>{return displayConnection == connectionToAdd;
            // return !(Object.keys(g.comms.displayConnections).find((displayConnection)=>{
                // return displayConnection == connectionToAdd;
            }))
        })

        console.log("need to add connections ",newConnections)
        //If they all try make connections i think a race condition might occur
            //try some sort of reduction thing
                //tell 1 about 2,3,4,5. 2 about 3,4,5. 3 about 4,5 and 4 about 5 
    }
    else if(theMessage.addControllerConnections){
        let newConnections = theMessage.addControllerConnections.filter((connectionToAdd)=>{
            return !(Object.keys(g.comms.controllerConnections).find((connectedControllerId)=>{
                return connectedControllerId == connectionToAdd;
            }))
        })

        newConnections.forEach((connectionId)=>{
            //not the best way but will check if it stops double ups
            g.comms.controllerConnections[connectionId] = {inProgress: true}
            console.log("connecting to ",connectionId)

            g.comms.pendingConnections[connectionId] = p2pConnect(connectionId,g.game.activeDisplayId,g.comms.serverConnection);
        })
    }
    else if(theMessage.shiftedPlayer){
        addPlayerEntity(theMessage.shiftedPlayer)
    }
}

function handleControllerMessage(message,fromWho){
    //very flimsy will break if not correctly formmatted as JSON 
    let theMessage = JSON.parse(message.data)

    if(g.game.playerEntities[fromWho]){
        if(theMessage.moveRight === true){
            g.game.playerEntities[fromWho].moveX = g.gameConstansts.playerMoveSpeed;
            g.game.playerEntities[fromWho].moveRight = theMessage.moveRight;
        }
        else if(theMessage.moveLeft === true){
            g.game.playerEntities[fromWho].moveX = -g.gameConstansts.playerMoveSpeed;
            g.game.playerEntities[fromWho].moveLeft = theMessage.moveLeft;
        }
        else if(theMessage.moveRight === false){
            if (g.game.playerEntities[fromWho].moveX > 0){
                g.game.playerEntities[fromWho].moveX = 0;
                if(g.game.playerEntities[fromWho].moveLeft){
                    g.game.playerEntities[fromWho].moveX = -g.gameConstansts.playerMoveSpeed;
                }
            }
            g.game.playerEntities[fromWho].moveRight = theMessage.moveRight;
        }
        else if(theMessage.moveLeft === false){
            if (g.game.playerEntities[fromWho].moveX < 0){
                g.game.playerEntities[fromWho].moveX = 0;

                if(g.game.playerEntities[fromWho].moveRight){
                    g.game.playerEntities[fromWho].moveX = g.gameConstansts.playerMoveSpeed;
                }
            }
            g.game.playerEntities[fromWho].moveLeft = theMessage.moveLeft;
        }
        else if(theMessage.action1 === true){
            g.game.playerEntities[fromWho].moveY = -20;
        }
        else if(theMessage.action2 === true){
            if(g.game.playerEntities[fromWho].stance == 0){
                g.game.playerEntities[fromWho].stance = 1;
            }
            else if(g.game.playerEntities[fromWho].stance == 1){
                g.game.playerEntities[fromWho].stance = 2;
            }
            else{
                g.game.playerEntities[fromWho].stance = 0;
            }
        }
        else if(theMessage.whoAreYou){
            g.comms.controllerConnections[fromWho].dataChannel.send(JSON.stringify({displayId:g.game.activeDisplayId}))
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

    let menuSectionContents = []
    menuSection.childNodes.forEach( (element)=>{
        menuSectionContents.push(element);
    })

    menuSectionContents.forEach((element)=>{
        menuSection.removeChild(element)
    })
    

    if(show){
        
        let newButton = document.createElement("button");
        newButton.title = "Hide Menu";
        newButton.innerHTML = newButton.title;
        newButton.onclick = () => {swapMenuContent(false)};
        newButton.style.gridColumn = "2";
        newButton.style.gridRow = "1";

        let platformDrawButton = document.createElement("button")
        platformDrawButton.style.gridColumn = "1";
        platformDrawButton.style.gridRow = "2";
        
        if(g.menuOptions.placePlatformsAllow){
            platformDrawButton.innerHTML = "platform draw enabled"
        }
        else{
            platformDrawButton.innerHTML = "platform draw disabled"
        }
        
        platformDrawButton.onclick = () => {
            //As it will be toggled
            if(!g.menuOptions.placePlatformsAllow){
                platformDrawButton.innerHTML = "platform draw enabled"
                portalMoveButton.innerHTML = "portal move disabled"
            }
            else{
                platformDrawButton.innerHTML = "platform draw disabled"
                portalMoveButton.innerHTML = "portal move disabled"
            }
            setNewPlatformDraw(!g.menuOptions.placePlatformsAllow);
        }

        let portalMoveButton = document.createElement("button")
        portalMoveButton.style.gridColumn = "2";
        portalMoveButton.style.gridRow = "2";
        
        if(g.menuOptions.portalMoveAllow){
            portalMoveButton.innerHTML = "portal move enabled"
        }
        else{
            portalMoveButton.innerHTML = "portal move disabled"
        }
        
        portalMoveButton.onclick = () => {
            //As it will be toggled
            if(!g.menuOptions.portalMoveAllow){
                portalMoveButton.innerHTML = "portal move enabled"
                platformDrawButton.innerHTML = "platform draw disabled"
            }
            else{
                portalMoveButton.innerHTML = "portal move disabled"
                platformDrawButton.innerHTML = "platform draw disabled"
            }
            setPortalMovemDraw(!g.menuOptions.portalMoveAllow);
        }

        let p2pTargetForm = document.createElement("form");
        p2pTargetForm.onsubmit = (event)=>{
            event.preventDefault();

            let value = document.getElementById("connectionTarget").value;
            if(!isNaN(parseInt(value))){
                // p2pConnect(parseInt(value))
                let whoTo = parseInt(value)
                g.comms.pendingConnections[whoTo] = p2pConnect(whoTo,g.game.activeDisplayId,g.comms.serverConnection);
            }
        }
        let p2pTarget = document.createElement("input");
        p2pTarget.type = "text";
        p2pTarget.id = "connectionTarget";
        p2pTarget.style.width = "100%";
        
        let p2pSubmit = document.createElement("input");
        p2pSubmit.type = "Submit";
        p2pSubmit.id = "connectToPeer";
        p2pSubmit.value = "connect to peer";

        p2pTargetForm.style.gridColumn = "3";
        p2pTargetForm.style.gridRow = "2";

        let leftSideDestination = document.createElement("select");
        leftSideDestination.id = "leftSideDestination"

        leftSideDestination.onchange = (e)=>{
            g.displayDetails.leftDisplay = e.target.value
        }
        
        let displayOption = document.createElement("option");
        displayOption.value = g.displayDetails.leftDisplay ? g.displayDetails.leftDisplay : null;
        displayOption.innerHTML = g.displayDetails.leftDisplay ? g.displayDetails.leftDisplay : "none";
        leftSideDestination.appendChild(displayOption);

        //show the list of options
        Object.keys(g.comms.displayConnections).forEach((key)=>{
            displayOption = document.createElement("option");
            displayOption.value = key;
            displayOption.innerHTML = key;
            leftSideDestination.appendChild(displayOption);
        })
        leftSideDestination.value = g.displayDetails.leftDisplay;
        
        let rightSideDestination = document.createElement("select");
        rightSideDestination.id = "rightSideDestination"

        rightSideDestination.onchange = (e)=>{
            g.displayDetails.rightDisplay = e.target.value
        }
        
        displayOption = document.createElement("option");
        displayOption.value = g.displayDetails.rightDisplay ? g.displayDetails.rightDisplay : null;
        displayOption.innerHTML = g.displayDetails.rightDisplay ? g.displayDetails.rightDisplay : "none";
        rightSideDestination.appendChild(displayOption);

        //show the list of options
        Object.keys(g.comms.displayConnections).forEach((key)=>{
            displayOption = document.createElement("option");
            displayOption.value = key;
            displayOption.innerHTML = key;
            rightSideDestination.appendChild(displayOption);
        })
        rightSideDestination.value = g.displayDetails.rightDisplay;

        let menuLineBreak = document.createElement("br");
        p2pTargetForm.appendChild(menuLineBreak);
        p2pTargetForm.appendChild(p2pTarget);
        p2pTargetForm.appendChild(p2pSubmit);

        menuSection.appendChild(newButton);
        menuSection.appendChild(platformDrawButton);
        menuSection.appendChild(portalMoveButton);
        menuSection.appendChild(p2pTargetForm);
        
        let leftDisplayState = document.createElement("span");
        leftDisplayState.innerHTML = "left side destination";
        let leftBlock = document.createElement("div");
        leftBlock.appendChild(leftDisplayState);
        leftBlock.appendChild(leftSideDestination);
        
        leftBlock.style.gridColumn = "1";
        leftBlock.style.gridRow = "3";
        menuSection.appendChild(leftBlock);
        
        p2pTargetForm.appendChild(menuLineBreak);

        let rightDisplayState = document.createElement("span");
        rightDisplayState.innerHTML = "right side destination"
        let rightBlock = document.createElement("div");
        rightBlock.appendChild(rightDisplayState)
        rightBlock.appendChild(rightSideDestination);
        
        rightBlock.style.gridColumn = "3";
        rightBlock.style.gridRow = "3";
        menuSection.appendChild(rightBlock)
        
        menuSection.className = "menuShowingSection"

    }
    else{

        let newButton = document.createElement("button");
        newButton.title = "Options menu";
        newButton.innerHTML = newButton.title;
        newButton.onclick = () => {swapMenuContent(true)};

        menuSection.className = "menuHidingSection"

        menuSection.appendChild(newButton);
    }
}

function setNewPlatformDraw(allow){
    //the == true is to enforce true or false incase a non boolean option is given
        //at least that is the intention
    g.menuOptions.placePlatformsAllow = (allow == true);
    g.menuOptions.portalMoveAllow = false;
}
function setPortalMovemDraw(allow){
    //the == true is to enforce true or false incase a non boolean option is given
        //at least that is the intention
    g.menuOptions.portalMoveAllow = (allow == true);
    g.menuOptions.placePlatformsAllow = false;
}
function addNewPlatform(x,y,width,height){
    if(g.menuOptions.placePlatformsAllow){

        //Should proabaly verify the values as being valid
        g.game.areaPlatforms.push({
            x,
            y,
            width,
            height
        }); 
        
        g.rendering.updateBackground = true;
    }
}

function setupDisplayArea(){
    
    g = new gameDisplay();

    g.gameConstansts.gameHeight = document.documentElement.clientHeight;
    g.gameConstansts.gameWidth = document.documentElement.clientWidth;
    
    let displayElementBackground = document.getElementById("canvasArea");

    let displayElement = document.getElementById("canvasAreaFront");

    displayElementBackground.setAttribute("width",g.gameConstansts.gameWidth);
    displayElementBackground.setAttribute("height",g.gameConstansts.gameHeight);
    displayElement.setAttribute("width",g.gameConstansts.gameWidth);
    displayElement.setAttribute("height",g.gameConstansts.gameHeight);

    g.canvas.back.clearRect(0,0,g.gameConstansts.gameWidth,g.gameConstansts.gameHeight);

    objectDrawFunctions.refreshCanvas(g.canvas.front,g.gameConstansts.gameWidth,g.gameConstansts.gameHeight)

    connectWebSocket();

    startGame();
}

function connectWebSocket(){
    // serverConnection = new WebSocket(`wss://${self.location.host}`);
    g.comms.serverConnection = new WebSocket(`ws://${self.location.host}`); //for localhost testing changeing it to non secure websockets as i have been a bit lazy in using openssl to create a self assinged certificate
    
    g.comms.serverConnection.onopen = ()=> {

        g.comms.serverConnection.send(JSON.stringify({actAsDisplay:true}));

        let connectionMessage = document.getElementById("serverConnectionState");
        
        connectionMessage.innerHTML = "server connected"
    }
    g.comms.serverConnection.onclose = ()=>{
        let connectionMessage = document.getElementById("serverConnectionState");
        
        connectionMessage.innerHTML = "server disconnected"
    }

    g.comms.serverConnection.onmessage = (message) =>{
        let theMessage = JSON.parse(message.data);

        if(theMessage.displayId){
            let displayIdMessage = document.getElementById("displayId");
            displayIdMessage.innerHTML = theMessage.displayId;

            g.game.activeDisplayId = theMessage.displayId
        }
        else if(theMessage.p2pConnect){

            if(theMessage.answer){
                p2pAcceptAnswer(theMessage.answer,theMessage.from,!theMessage.isADisplay)
            }
            else if(theMessage.offer){
                p2pAcceptOffer(theMessage.offer,theMessage.from,!theMessage.isADisplay)
            }
        }
    }
}

function addPortal(displayId){
    g.game.portals.push({
        x: 100*(g.game.portals.length + 1),
        y: 100,
        destination: displayId
    })
}

function addPlayerEntity(player){
    //this should enforce unique ids
    let newPlayer = {
        id:player,
        x:g.gameConstansts.gameWidth/2,
        y:g.gameConstansts.gameHeight/2,
        moveY:0,
        moveX:0,
        width:g.gameConstansts.entitySize/4,
        height:g.gameConstansts.entitySize,
        // stance: 0
        stance: Math.floor(Math.random()*3)
    }
    g.game.playerEntities[player] = newPlayer;

}

function startGame(){

    setupMouseClicks()

    setInterval(gameStep,20);
}

//This wont work on mobiles. consider using pointer up down events.
    //ios might require touchstart/touchStop
function setupMouseClicks(){
    
    let displayElement = document.getElementById("canvasAreaFront");
    
    displayElement.addEventListener("mousedown",(evt)=>{
        g.mouse.downLocation = {x:evt.clientX,y:evt.clientY}

        if(g.menuOptions.portalMoveAllow){
            g.game.portals.forEach((portal,index)=>{
                if((portal.x + g.gameConstansts.entitySize > g.mouse.downLocation.x) && (portal.x - g.gameConstansts.entitySize < g.mouse.downLocation.x)){
                    if((portal.y + g.gameConstansts.entitySize > g.mouse.downLocation.y) && (portal.y - g.gameConstansts.entitySize < g.mouse.downLocation.y)){
                        g.menuOptions.portalToMove = g.game.portals[index].destination;
                    }
                }
            })
        }
    })
    displayElement.addEventListener("mousemove",(evt)=>{

        //use this to draw a demo square        
        g.mouse.upLocation = {x:evt.clientX,y:evt.clientY}
    })
    displayElement.addEventListener("mouseup",(evt)=>{
        
        //if screenX is used it grabs the location in relation to the monitor
        g.mouse.upLocation = {x:evt.clientX,y:evt.clientY}

        if(g.mouse.downLocation !== null && g.menuOptions.placePlatformsAllow){

            let platformX = (g.mouse.downLocation.x < g.mouse.upLocation.x) ? g.mouse.downLocation.x : g.mouse.upLocation.x;
            let platformY = (g.mouse.downLocation.y < g.mouse.upLocation.y) ? g.mouse.downLocation.y : g.mouse.upLocation.y;

            //Need to figure out proper offset. this isnt quite right
                //Got it. needs the whole hirachy of the dom to the canvas object. its offset is relative to its parent. click is based on the overall location on the window
            let topDiv = document.getElementById("topDiv")
            platformX -= displayElement.offsetLeft + topDiv.offsetLeft;
            platformY -= displayElement.offsetTop + topDiv.offsetTop;

            let platformWidth = Math.abs(g.mouse.downLocation.x - g.mouse.upLocation.x);
            let platformHeight = Math.abs(g.mouse.downLocation.y - g.mouse.upLocation.y);

            let newPlatform = {
                x:platformX,
                y:platformY,
                width:platformWidth,
                height:platformHeight,
            }
            
            g.mouse.downLocation = null
            g.mouse.upLocation = null
            
            //probably easier to just pass the object really. but already done this
            addNewPlatform(newPlatform.x,newPlatform.y,newPlatform.width,newPlatform.height);
            // areaPlatforms.push(newPlatform);
        }
        else if(g.menuOptions.portalToMove > -1 && g.menuOptions.portalMoveAllow){
            
            //place the portal in the new position
            let portalMove = g.game.portals.reduce((indexOfMatch,portal,index)=> {
                if(portal.destination == g.menuOptions.portalToMove){
                    return index;
                }
                return indexOfMatch;
            },-1)
            if(portalMove > -1){
                
                g.game.portals[portalMove].x = g.mouse.upLocation.x;
                g.game.portals[portalMove].y = g.mouse.upLocation.y;

                //clear the portal on the front canvas
                let topDiv = document.getElementById("topDiv")
                let clearX = g.mouse.upLocation.x - displayElement.offsetLeft - topDiv.offsetLeft - 50
                let clearY = g.mouse.upLocation.y - displayElement.offsetTop - topDiv.offsetTop - 50
                
                objectDrawFunctions.clearPlatform({x:clearX,y:clearY,width:100,height:100},g.canvas.front)


                g.rendering.updateBackground = true;
                g.menuOptions.portalToMove = -1;
            }
        }

        g.menuOptions.previewPlatform = null
    })
}

function gameStep(){
    
    
    //Must be done before the entities are moved
    clearOldEntities(g.canvas.front);
    updateEntityStates();

    if(g.rendering.updateBackground){
        g.rendering.updateBackground = false;
        objectDrawFunctions.refreshCanvas(g.canvas.back,g.gameConstansts.gameWidth,g.gameConstansts.gameHeight);
        objectDrawFunctions.drawPlatforms(g.canvas.back,g.game.areaPlatforms);
        objectDrawFunctions.drawPortals(g.canvas.back,g.game.portals);
    }

    drawEnteties(g.canvas.front);
    drawVisualAdditions(g.canvas.front);
}

/* ---------------------- maybe MOVE TO ObjectDraw       -------------------------------*/
//For drawing things that ddont interact like the example platform square or drag and drop location of things
function drawVisualAdditions(canvas){

    if(g.mouse.upLocation && g.mouse.downLocation && g.menuOptions.placePlatformsAllow){
        
        let platform = {}
        let displayElement = document.getElementById("canvasArea");
        let topDiv = document.getElementById("topDiv")
        platform.x = ((g.mouse.downLocation.x < g.mouse.upLocation.x) ? g.mouse.downLocation.x : g.mouse.upLocation.x) - displayElement.offsetLeft + topDiv.offsetLeft;
        platform.y = ((g.mouse.downLocation.y < g.mouse.upLocation.y) ? g.mouse.downLocation.y : g.mouse.upLocation.y) - displayElement.offsetTop + topDiv.offsetTop;
        platform.width = Math.abs(g.mouse.downLocation.x - g.mouse.upLocation.x);
        platform.height = Math.abs(g.mouse.downLocation.y - g.mouse.upLocation.y);
        if(g.menuOptions.previewPlatform){
            objectDrawFunctions.clearPlatform(g.menuOptions.previewPlatform,canvas)
        }
        g.menuOptions.previewPlatform = platform
        objectDrawFunctions.drawPlatform(platform,canvas)
    }
    else if(g.menuOptions.portalMoveAllow && g.menuOptions.portalToMove > -1){

        let tempPortal = {
            x:g.mouse.upLocation.x,
            y:g.mouse.upLocation.y,
            destination:g.menuOptions.portalToMove
        }
        
        //for a quick and simple test just using the platform redraw stuff
        let platform = {}
        let displayElement = document.getElementById("canvasArea");
        let topDiv = document.getElementById("topDiv")
        platform.x = (g.mouse.upLocation.x) - displayElement.offsetLeft + topDiv.offsetLeft - 50;
        platform.y = (g.mouse.upLocation.y) - displayElement.offsetTop + topDiv.offsetTop -50;
        platform.width = 100;
        platform.height = 100;
        if(g.menuOptions.previewPlatform){
            objectDrawFunctions.clearPlatform(g.menuOptions.previewPlatform,canvas)
        }
        g.menuOptions.previewPlatform = platform
        /*-----------------------------------TEMP CODE-----------------------------------------------*/

        objectDrawFunctions.drawPortal(tempPortal,canvas)
        //draw the portal in the current mouse position
    }
}

function clearOldEntities(canvas){
    Object.keys(g.game.playerEntities).forEach(key => {
        let element = g.game.playerEntities[key];
        objectDrawFunctions.clearPlayerObject(element,canvas);
    });
    
    Object.keys(g.game.playersDeleting).forEach(key => {
        let element = g.game.playersDeleting[key];
        objectDrawFunctions.clearPlayerObject(element,canvas);
    });
    
    Object.keys(g.game.playersRespawn).forEach(key => {
        let element = g.game.playersRespawn[key];
        objectDrawFunctions.clearPlayerObject(element,canvas);
    });
}
function drawEnteties(canvas){

    Object.keys(g.game.playerEntities).forEach(key => {
        let element = g.game.playerEntities[key];
        objectDrawFunctions.drawPerson(element,canvas);
    });

    Object.keys(g.game.playersDeleting).forEach(key => {
        let element = g.game.playersDeleting[key];
        objectDrawFunctions.playerDismantle(element,canvas,g.gameConstansts.gameHeight);
    });
    
    Object.keys(g.game.playersRespawn).forEach(key => {
        let element = g.game.playersRespawn[key];
        objectDrawFunctions.playerDismantle(element,canvas);
    });
}

function updateEntityStates(){
    let playersShifted = [];
    let playersDefeated = [];

    Object.keys(g.game.playerEntities).map(playerIndex => {
        let playerObject = g.game.playerEntities[playerIndex];

        playerObject = physActions.playerMovements(playerObject);

        if(playerObject.moveX < 0){
            playerObject.facingLeft = true;
        }
        else if(playerObject.moveX > 0){
            playerObject.facingLeft = false;
        }
        
        let platformCollisions = physActions.getPlatformCollisions(playerObject,g.game.areaPlatforms);
            
        if(platformCollisions.length > 0){
            playerObject = physActions.platformCollisionsAction(platformCollisions,playerObject)
        }
        else{
            playerObject = physActions.playerMovementCheck(playerObject,g.gameConstansts.playerMoveSpeed)
        }

        playerObject = physActions.playerGroundDetectionAction(playerObject,g.gameConstansts.gameHeight)
        
        let sideCollision = physActions.displaySideCollision(playerObject,g.gameConstansts.gameWidth);

        if(sideCollision.collision){
            playerObject.x = sideCollision.x;

            if(sideCollision.left && g.displayDetails.leftDisplay){
                g.comms.controllerConnections[playerIndex].dataChannel.send(JSON.stringify({shiftDisplay:g.displayDetails.leftDisplay}))
                g.comms.displayConnections[g.displayDetails.leftDisplay].dataChannel.send(JSON.stringify({shiftedPlayer:playerIndex}))
                if(!playersShifted.find( player => player == playerObject.id)){
                    playersShifted.push(playerObject.id)
                }
            }
            else if(sideCollision.right && g.displayDetails.rightDisplay){
                g.comms.controllerConnections[playerIndex].dataChannel.send(JSON.stringify({shiftDisplay:g.displayDetails.rightDisplay}))
                g.comms.displayConnections[g.displayDetails.rightDisplay].dataChannel.send(JSON.stringify({shiftedPlayer:playerIndex}))
                if(!playersShifted.find( player => player == playerObject.id)){
                    playersShifted.push(playerObject.id)
                }
            }

            
        }


        let portalCollision = physActions.portalCollisions(playerObject,g.game.portals)
        let playerBattles = physActions.checkPlayerInteractions(playerObject,g.game.playerEntities)
        

        if(portalCollision){
            //send off controller to other display
            g.comms.controllerConnections[playerIndex].dataChannel.send(JSON.stringify({shiftDisplay:portalCollision.destination}))
            g.comms.displayConnections[portalCollision.destination].dataChannel.send(JSON.stringify({shiftedPlayer:playerIndex}))
            
            if(!playersShifted.find( player => player == playerObject.id)){
                playersShifted.push(playerObject.id)
            }
        }
        else if(playerBattles) {
            console.log("player "+playerObject.id+" defeated");
            playersDefeated.push(playerObject.id)
        }

        g.game.playerEntities[playerIndex] = playerObject;
    });

    //playerRemoval()   //could logically combine the two
    playerDeletingAction(playersShifted)
    playerDismantlingAction()

    playerDefeatedSwitch(playersDefeated)
    playerDefeatedAnimate()
}

function playerDeletingAction(playersShifted){
    playersShifted.forEach( (keyToDelete)=>{
        
        g.game.playersDeleting[keyToDelete] = g.game.playerEntities[keyToDelete];
        delete g.game.playerEntities[keyToDelete];
    })
}

function playerDismantlingAction(){
    //still dont think im doing this is a good way
    let playersDeletingKeys = Object.keys(g.game.playersDeleting)
    playersDeletingKeys.forEach( (key)=>{
        if(objectDrawFunctions.isPlayerDismantled(g.game.playersDeleting[key])){
            delete g.game.playersDeleting[key];
        }   
    })
}

function playerDefeatedSwitch(playersDefeated){
    //Alternative is to give the objects a 
    playersDefeated.forEach( (keyToMove)=>{
        g.game.playersRespawn[keyToMove] = g.game.playerEntities[keyToMove];
        delete g.game.playerEntities[keyToMove];
    })
}

function playerDefeatedAnimate(){
    let playersRespawningKeys = Object.keys(g.game.playersRespawn)
    playersRespawningKeys.forEach( (key)=>{
        if(objectDrawFunctions.isPlayerDismantled(g.game.playersRespawn[key])){
            addPlayerEntity(key)
            delete g.game.playersRespawn[key];
        }   
    })
}