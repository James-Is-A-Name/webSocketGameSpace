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
            p2pConnections : {}, //Have all connections in one object but have them flag what they are after connecting
            
            serverConnection: {},
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


    /*---------------------Connection refining actions----------------------*/
    getDisplayConnections(){

        let displayConnectionsKeys = Object.keys(this.comms.p2pConnections).filter((key)=>{
            return this.comms.p2pConnections[key].type == "display" && this.comms.p2pConnections[key].status == "connected"
        })

        let displayConnections = displayConnectionsKeys.reduce((connectionsObject,key)=>{
            connectionsObject[key] = this.comms.p2pConnections[key].connection
            return connectionsObject;
        },{})
        
        return displayConnections
    }

    getControllerConnections(){

        let controllerConnectionsKeys = Object.keys(this.comms.p2pConnections).filter((key)=>{
            return this.comms.p2pConnections[key].type == "controller" && this.comms.p2pConnections[key].status == "connected"
        })

        let controllerConnections = controllerConnectionsKeys.reduce((connectionsObject,key)=>{

            connectionsObject[key] =  this.comms.p2pConnections[key].connection
            return connectionsObject
        },{})
        
        return controllerConnections
    }
    /*---------------------Connection refining actions----------------------*/

    assignConnection(connectionId,connection,type,status){
        if(this.comms.p2pConnections[connectionId] == undefined){
            this.comms.p2pConnections[connectionId] = {}
        }
        
        this.comms.p2pConnections[connectionId].connection = connection;
        this.comms.p2pConnections[connectionId].type = type;
        this.comms.p2pConnections[connectionId].status = status;
    }

    /* ---------------------- MOVE TO connections Maybe   -------------------------------*/
    p2pConnect(whoTo){
        //create a socket thing
        let connection = getAWebRTC();

        //setup how to send it off
        connection.sendOfferFunction = ()=>{
            //Hard code who to send a message for now
            let message = {
                p2pConnect: true,
                target: whoTo,
                from: this.game.activeDisplayId,
                isADisplay: true,
                offer: connection.offerToSend
            }
            this.comms.serverConnection.send(JSON.stringify(message))

        }

        //trigger the offer that will then trigger the send
        connection.createOffer()

        this.assignConnection(whoTo,connection,"pending","pending")

        return connection;
    }

    /* ---------------------- MOVE TO connections             -------------------------------*/
    p2pAcceptOffer(offer,fromWho,isAController){ //got an offer so accept it and send an answer
        // function p2pAcceptOffer(offer,fromWho,isAController,displayId,serverConnection){

        let connection = getAWebRTC();

        connection.sendAnswerFunction = () =>{

            //this should have a single point of decleration so the display and controllers don't get out of sync
            let message = {
                p2pConnect: true,
                target: fromWho,
                from: this.game.activeDisplayId,
                isADisplay: true,
                answer: connection.answerToSend
            }
            this.comms.serverConnection.send(JSON.stringify(message))
        }

        connection.acceptOffer(JSON.parse(offer))

        connection.dataChannelSetupCallback = ()=>{
            //POSSIBLE LOOP ISSUES HERE IF NOT THOUGHT ABOUT PROPERLY
            //INTIAL TESTING HAPPENING
                //dosent seem to loop too much but might be different
                //possibly will loop when trying to connect to a new controller that isnt active. not entierly sure it will but it might
            this.comms.p2pConnections[fromWho].status = "connected"
            this.updateDisplayConnections()
        }

        let connectionIsController = isAController;

        connection.connectionId = fromWho;

        if(connectionIsController){
            connection.handleMessage = this.handleControllerMessage.bind(this)
            
            this.assignConnection(fromWho,connection,"controller","pending")
        }
        else{
            //if not in portals add it
            if(!this.game.portals.find( (portal) => portal.id == fromWho )){
                this.addPortal(fromWho)
                this.rendering.updateBackground = true;

                this.assignConnection(fromWho,connection,"display","pending")
            }

            connection.handleMessage = this.handleDisplayMessage.bind(this)
        }
    }

    /* ---------------------- MOVE TO connections             -------------------------------*/
    p2pAcceptAnswer(answer,fromWho,isAController){
        // this will have issues if the connection isnt setup first. consider putting a first check if there is even a connection object assigned
        let connection = this.comms.p2pConnections[fromWho].connection
        if(!connection){
            return;
        }

        connection.acceptAnswer(JSON.parse(answer))

        let connectionIsController = isAController;

        connection.connectionId = fromWho;

        connection.dataChannelSetupCallback = ()=>{
            //POSSIBLE LOOP ISSUES HERE IF NOT THOUGHT ABOUT PROPERLY
            //INTIAL TESTING HAPPENING
                //dosent seem to loop too much but might be different
                //possibly will loop when trying to connect to a new controller that isnt active. not entierly sure it will but it might
            this.comms.p2pConnections[fromWho].status = "connected"
            this.updateDisplayConnections();
        }

        if(connectionIsController){

            connection.handleMessage = this.handleControllerMessage.bind(this)

            this.assignConnection(fromWho,connection,"controller","pending")
        }
        else{        //if not in portals add it
            if(!this.game.portals.find( (portal) => portal.id == fromWho )){

                this.addPortal(fromWho)
                this.rendering.updateBackground = true;

                this.assignConnection(fromWho,connection,"display","pending")
            }
            connection.handleMessage = this.handleDisplayMessage.bind(this)
        }
    }

    /* ---------------------- MOVE TO connections             -------------------------------*/
    updateDisplayConnections(){
        //send to all displays the current list of controllers
        let connectedControllerIds = {addControllerConnections:Object.keys(this.getControllerConnections())}

        this.broadcastToDisplays(connectedControllerIds)
        
        //in a more planned manner do the same with the list of displays
            //tell one of two displays to connect. not both as one needs to send an offer and the other an answer
    }

    /* ---------------------- MOVE TO connections             -------------------------------*/
    broadcastToDisplays(message){
        let displayConnections = this.getDisplayConnections();
        Object.keys(displayConnections).forEach((key)=>{

            //THIS SHOULD BE ALTERED TO BE A SEND MESSAGE FUNCTION like sendMessage(whoTo,message)

            displayConnections[key].dataChannel.send(JSON.stringify(message))
        })
    }

    handleDisplayMessage(message,fromWho){
        let theMessage = JSON.parse(message.data)

        if(theMessage.addConnections){
            let newConnections = theMessage.addConnections.filter((connectionToAdd)=>{
                if(this.game.activeDisplayId == connectionToAdd){
                    return false;
                }

                return !(Object.keys(this.getDisplayConnections())
                .find((displayConnection)=> displayConnection == connectionToAdd))
            })

            console.log("need to add connections ",newConnections)
            //If they all try make connections i think a race condition might occur
                //try some sort of reduction thing
                    //tell 1 about 2,3,4,5. 2 about 3,4,5. 3 about 4,5 and 4 about 5
        }
        else if(theMessage.addControllerConnections){
            let newConnections = theMessage.addControllerConnections.filter((connectionToAdd)=>{
                return !(Object.keys(this.getControllerConnections()).find((connectedControllerId)=>{
                    return connectedControllerId == connectionToAdd;
                }))
            })

            newConnections.forEach((connectionId)=>{
                //not the best way but will check if it stops double ups
                this.p2pConnect(connectionId);
            })
        }
        else if(theMessage.shiftedPlayer){
            this.addPlayerEntity(theMessage.shiftedPlayer)
        }
    }

    handleControllerMessage(message,fromWho){
        //very flimsy will break if not correctly formmatted as JSON
        let theMessage = JSON.parse(message.data)

        if(this.game.playerEntities[fromWho]){
            if(theMessage.moveRight === true){
                this.game.playerEntities[fromWho].moveX = this.gameConstansts.playerMoveSpeed;
                this.game.playerEntities[fromWho].moveRight = theMessage.moveRight;
            }
            else if(theMessage.moveLeft === true){
                this.game.playerEntities[fromWho].moveX = -this.gameConstansts.playerMoveSpeed;
                this.game.playerEntities[fromWho].moveLeft = theMessage.moveLeft;
            }
            else if(theMessage.moveRight === false){
                if (this.game.playerEntities[fromWho].moveX > 0){
                    this.game.playerEntities[fromWho].moveX = 0;
                    if(this.game.playerEntities[fromWho].moveLeft){
                        this.game.playerEntities[fromWho].moveX = -this.gameConstansts.playerMoveSpeed;
                    }
                }
                this.game.playerEntities[fromWho].moveRight = theMessage.moveRight;
            }
            else if(theMessage.moveLeft === false){
                if (this.game.playerEntities[fromWho].moveX < 0){
                    this.game.playerEntities[fromWho].moveX = 0;

                    if(this.game.playerEntities[fromWho].moveRight){
                        this.game.playerEntities[fromWho].moveX = this.gameConstansts.playerMoveSpeed;
                    }
                }
                this.game.playerEntities[fromWho].moveLeft = theMessage.moveLeft;
            }
            else if(theMessage.action1 === true){
                this.game.playerEntities[fromWho].moveY = -20;
            }
            else if(theMessage.action2 === true){
                if(this.game.playerEntities[fromWho].stance == 0){
                    this.game.playerEntities[fromWho].stance = 1;
                }
                else if(this.game.playerEntities[fromWho].stance == 1){
                    this.game.playerEntities[fromWho].stance = 2;
                }
                else{
                    this.game.playerEntities[fromWho].stance = 0;
                }
            }
            else if(theMessage.whoAreYou){
                this.getControllerConnections()[fromWho].dataChannel.send(JSON.stringify({displayId:this.game.activeDisplayId}))
            }
        }
        else if(theMessage.joinAsNewController){
            console.log("got request from controller to act as a player")
            this.addPlayerEntity(fromWho);
        }
    }

    /* ---------------------- sort out a better way of doing this    -------------------------------*/
    //function swapMenuContent(show,menuElement,portals,serverComs,connectP2p,toggleInteractionType,platformPlaceState,portalPlaceState){
    menuStateToggle(show){
        let menuElement = document.getElementById("menuSection");
        let portals = Object.keys(this.getDisplayConnections());
        let serverComs = null; //not convinced this is needed
    
        //This inconsistency in naming is going to bite me in the ass at a later point
        let connectP2p = this.p2pConnect.bind(this)
        
        let toggleInteractionType = (type) =>{

            if(type == "platform" && !this.menuOptions.placePlatformsAllow){
                this.setNewPlatformDraw(true)
            }
            else if(type == "portal" && !this.menuOptions.portalMoveAllow){
                this.setPortalMovemDraw(true)
            }
            else{
                //they essentially do the same thing when false is used. might consider consolodating them then
                this.setNewPlatformDraw(false)
            }
            //shouldnt really matter too much to just redraw the whole menu as it would be user triggered(so not often to impede things) and not noticable to them
            
            this.menuStateToggle(true)
        }
        toggleInteractionType = toggleInteractionType.bind(this)
        
        let platformPlaceState = this.menuOptions.placePlatformsAllow;
        let portalPlaceState = this.menuOptions.portalMoveAllow;

        let settings = {
            displayIds: portals,
            serverComs: serverComs,
            connectP2p: connectP2p,
            toggleInteractionType: toggleInteractionType,
            platformPlaceState: platformPlaceState,
            portalPlaceState: portalPlaceState,
            rightDisplay: this.displayDetails.rightDisplay,
            leftDisplay: this.displayDetails.leftDisplay,
            sideDisplayChange: this.sideDisplayChange,
        }


        /* -----------------------------------------THIS IS CURRENTLY BEING RELIED IT IS SET GLOBALY SOMEWHERE. AIM TO CHANGE THAT SOONER RATHER THAN LATER */
        let theToggleMenuFunction = ((state)=>{
            this.menuStateToggle(state)
        }).bind(this)

        swapMenuContent(show,menuElement,theToggleMenuFunction,settings);

    }

    setNewPlatformDraw(allow){
        //the == true is to enforce true or false incase a non boolean option is given
            //at least that is the intention
        this.menuOptions.placePlatformsAllow = (allow == true);
        this.menuOptions.portalMoveAllow = false;
    }
    setPortalMovemDraw(allow){
        //the == true is to enforce true or false incase a non boolean option is given
            //at least that is the intention
        this.menuOptions.portalMoveAllow = (allow == true);
        this.menuOptions.placePlatformsAllow = false;
    }
    addNewPlatform(x,y,width,height){
        if(this.menuOptions.placePlatformsAllow){

            //Should proabaly verify the values as being valid
            this.game.areaPlatforms.push({
                x,
                y,
                width,
                height
            });

            this.rendering.updateBackground = true;
        }
    }

    setupDisplayArea(){

        this.gameConstansts.gameHeight = document.documentElement.clientHeight;
        this.gameConstansts.gameWidth = document.documentElement.clientWidth;

        let displayElementBackground = document.getElementById("canvasArea");

        let displayElement = document.getElementById("canvasAreaFront");

        displayElementBackground.setAttribute("width",this.gameConstansts.gameWidth);
        displayElementBackground.setAttribute("height",this.gameConstansts.gameHeight);
        displayElement.setAttribute("width",this.gameConstansts.gameWidth);
        displayElement.setAttribute("height",this.gameConstansts.gameHeight);

        this.canvas.back.clearRect(0,0,this.gameConstansts.gameWidth,this.gameConstansts.gameHeight);

        objectDrawFunctions.refreshCanvas(this.canvas.front,this.gameConstansts.gameWidth,this.gameConstansts.gameHeight)

        this.connectWebSocket();

        this.startGame();
    }

    connectWebSocket(){

        if(self.location.host == "basically-rock-paper-scissors.herokuapp.com"){
            this.comms.serverConnection = new WebSocket(`wss://${self.location.host}`);
        }
        else{
            this.comms.serverConnection = new WebSocket(`ws://${self.location.host}`); //for localhost testing changeing it to non secure websockets as i have been a bit lazy in using openssl to create a self assinged certificate
        }

        this.comms.serverConnection.onopen = ()=> {

            this.comms.serverConnection.send(JSON.stringify({actAsDisplay:true}));

            let connectionMessage = document.getElementById("serverConnectionState");

            connectionMessage.innerHTML = "server connected"
        }
        this.comms.serverConnection.onclose = ()=>{
            let connectionMessage = document.getElementById("serverConnectionState");

            connectionMessage.innerHTML = "server disconnected"
        }

        this.comms.serverConnection.onmessage = (message) =>{
            let theMessage = JSON.parse(message.data);

            if(theMessage.displayId){
                let displayIdMessage = document.getElementById("displayId");
                displayIdMessage.innerHTML = theMessage.displayId;

                this.game.activeDisplayId = theMessage.displayId
            }
            else if(theMessage.p2pConnect){


                if(theMessage.answer){
                    this.p2pAcceptAnswer(theMessage.answer,theMessage.from,!theMessage.isADisplay)
                }
                else if(theMessage.offer){
                    this.p2pAcceptOffer(theMessage.offer,theMessage.from,!theMessage.isADisplay)
                }
            }
        }
    }

    addPortal(displayId){
        this.game.portals.push({
            x: 100*(this.game.portals.length + 1),
            y: 100,
            destination: displayId
        })
    }

    addPlayerEntity(player){
        //this should enforce unique ids
        let newPlayer = {
            id:player,
            x:this.gameConstansts.gameWidth/2,
            y:this.gameConstansts.gameHeight/2,
            moveY:0,
            moveX:0,
            width:this.gameConstansts.entitySize/4,
            height:this.gameConstansts.entitySize,
            // stance: 0
            stance: Math.floor(Math.random()*3)
        }
        this.game.playerEntities[player] = newPlayer;

    }

    sideDisplayChange(side,destination){
        if(side == "left"){
            this.displayDetails.leftDisplay = destination
        }else if(side == "right"){
            this.displayDetails.rightDisplay = destination
        }
    }

    startGame(){

        this.setupMouseClicks()

        //Might want to assign this to a varaible so it can be stopped somewhere else in the code .e.g game end after a certain amount of time

        let testFunctionBind = this.gameStep.bind(this)
        setInterval(testFunctionBind,20);
    }

    //This wont work on mobiles. consider using pointer up down events.
        //ios might require touchstart/touchStop
    setupMouseClicks(){

        let displayElement = document.getElementById("canvasAreaFront");

        displayElement.addEventListener("mousedown",(evt)=>{
            this.mouse.downLocation = {x:evt.clientX,y:evt.clientY}

            if(this.menuOptions.portalMoveAllow){
                this.game.portals.forEach((portal,index)=>{
                    if((portal.x + this.gameConstansts.entitySize > this.mouse.downLocation.x) && (portal.x - this.gameConstansts.entitySize < this.mouse.downLocation.x)){
                        if((portal.y + this.gameConstansts.entitySize > this.mouse.downLocation.y) && (portal.y - this.gameConstansts.entitySize < this.mouse.downLocation.y)){
                            this.menuOptions.portalToMove = this.game.portals[index].destination;
                        }
                    }
                })
            }
        })
        displayElement.addEventListener("mousemove",(evt)=>{

            //use this to draw a demo square
            this.mouse.upLocation = {x:evt.clientX,y:evt.clientY}
        })
        displayElement.addEventListener("mouseup",(evt)=>{

            //if screenX is used it grabs the location in relation to the monitor
            this.mouse.upLocation = {x:evt.clientX,y:evt.clientY}

            if(this.mouse.downLocation !== null && this.menuOptions.placePlatformsAllow){

                let platformX = (this.mouse.downLocation.x < this.mouse.upLocation.x) ? this.mouse.downLocation.x : this.mouse.upLocation.x;
                let platformY = (this.mouse.downLocation.y < this.mouse.upLocation.y) ? this.mouse.downLocation.y : this.mouse.upLocation.y;

                //Need to figure out proper offset. this isnt quite right
                    //Got it. needs the whole hirachy of the dom to the canvas object. its offset is relative to its parent. click is based on the overall location on the window
                let topDiv = document.getElementById("topDiv")
                platformX -= displayElement.offsetLeft + topDiv.offsetLeft;
                platformY -= displayElement.offsetTop + topDiv.offsetTop;

                let platformWidth = Math.abs(this.mouse.downLocation.x - this.mouse.upLocation.x);
                let platformHeight = Math.abs(this.mouse.downLocation.y - this.mouse.upLocation.y);

                let newPlatform = {
                    x:platformX,
                    y:platformY,
                    width:platformWidth,
                    height:platformHeight,
                }

                this.mouse.downLocation = null
                this.mouse.upLocation = null

                //probably easier to just pass the object really. but already done this
                this.addNewPlatform(newPlatform.x,newPlatform.y,newPlatform.width,newPlatform.height);
                // areaPlatforms.push(newPlatform);
            }
            else if(this.menuOptions.portalToMove > -1 && this.menuOptions.portalMoveAllow){

                //place the portal in the new position
                let portalMove = this.game.portals.reduce((indexOfMatch,portal,index)=> {
                    if(portal.destination == this.menuOptions.portalToMove){
                        return index;
                    }
                    return indexOfMatch;
                },-1)
                if(portalMove > -1){

                    this.game.portals[portalMove].x = this.mouse.upLocation.x;
                    this.game.portals[portalMove].y = this.mouse.upLocation.y;

                    //clear the portal on the front canvas
                    let topDiv = document.getElementById("topDiv")
                    let clearX = this.mouse.upLocation.x - displayElement.offsetLeft - topDiv.offsetLeft - 50
                    let clearY = this.mouse.upLocation.y - displayElement.offsetTop - topDiv.offsetTop - 50

                    objectDrawFunctions.clearPlatform({x:clearX,y:clearY,width:100,height:100},this.canvas.front)


                    this.rendering.updateBackground = true;
                    this.menuOptions.portalToMove = -1;
                }
            }

            this.menuOptions.previewPlatform = null
        })
    }

    gameStep(){

        //Must be done before the entities are moved
        this.clearOldEntities(this.canvas.front);
        this.updateEntityStates();

        if(this.rendering.updateBackground){
            this.rendering.updateBackground = false;
            objectDrawFunctions.refreshCanvas(this.canvas.back,this.gameConstansts.gameWidth,this.gameConstansts.gameHeight);
            objectDrawFunctions.drawPlatforms(this.canvas.back,this.game.areaPlatforms);
            objectDrawFunctions.drawPortals(this.canvas.back,this.game.portals);
        }

        this.drawEnteties(this.canvas.front);
        this.drawVisualAdditions(this.canvas.front);
    }

    /* ---------------------- maybe MOVE TO ObjectDraw       -------------------------------*/
    //For drawing things that ddont interact like the example platform square or drag and drop location of things
    drawVisualAdditions(canvas){

        if(this.mouse.upLocation && this.mouse.downLocation && this.menuOptions.placePlatformsAllow){

            let platform = {}
            let displayElement = document.getElementById("canvasArea");
            let topDiv = document.getElementById("topDiv")
            platform.x = ((this.mouse.downLocation.x < this.mouse.upLocation.x) ? this.mouse.downLocation.x : this.mouse.upLocation.x) - displayElement.offsetLeft + topDiv.offsetLeft;
            platform.y = ((this.mouse.downLocation.y < this.mouse.upLocation.y) ? this.mouse.downLocation.y : this.mouse.upLocation.y) - displayElement.offsetTop + topDiv.offsetTop;
            platform.width = Math.abs(this.mouse.downLocation.x - this.mouse.upLocation.x);
            platform.height = Math.abs(this.mouse.downLocation.y - this.mouse.upLocation.y);
            if(this.menuOptions.previewPlatform){
                objectDrawFunctions.clearPlatform(this.menuOptions.previewPlatform,canvas)
            }
            this.menuOptions.previewPlatform = platform
            objectDrawFunctions.drawPlatform(platform,canvas)
        }
        else if(this.menuOptions.portalMoveAllow && this.menuOptions.portalToMove > -1){

            let tempPortal = {
                x:this.mouse.upLocation.x,
                y:this.mouse.upLocation.y,
                destination:this.menuOptions.portalToMove
            }

            //for a quick and simple test just using the platform redraw stuff
            let platform = {}
            let displayElement = document.getElementById("canvasArea");
            let topDiv = document.getElementById("topDiv")
            platform.x = (this.mouse.upLocation.x) - displayElement.offsetLeft + topDiv.offsetLeft - 50;
            platform.y = (this.mouse.upLocation.y) - displayElement.offsetTop + topDiv.offsetTop -50;
            platform.width = 100;
            platform.height = 100;
            if(this.menuOptions.previewPlatform){
                objectDrawFunctions.clearPlatform(this.menuOptions.previewPlatform,canvas)
            }
            this.menuOptions.previewPlatform = platform
            /*-----------------------------------TEMP CODE-----------------------------------------------*/

            objectDrawFunctions.drawPortal(tempPortal,canvas)
            //draw the portal in the current mouse position
        }
    }

    clearOldEntities(canvas){
        Object.keys(this.game.playerEntities).forEach(key => {
            let element = this.game.playerEntities[key];
            objectDrawFunctions.clearPlayerObject(element,canvas);
        });

        Object.keys(this.game.playersDeleting).forEach(key => {
            let element = this.game.playersDeleting[key];
            objectDrawFunctions.clearPlayerObject(element,canvas);
        });

        Object.keys(this.game.playersRespawn).forEach(key => {
            let element = this.game.playersRespawn[key];
            objectDrawFunctions.clearPlayerObject(element,canvas);
        });
    }
    drawEnteties(canvas){

        Object.keys(this.game.playerEntities).forEach(key => {
            let element = this.game.playerEntities[key];
            objectDrawFunctions.drawPerson(element,canvas);
        });

        Object.keys(this.game.playersDeleting).forEach(key => {
            let element = this.game.playersDeleting[key];
            objectDrawFunctions.playerDismantle(element,canvas,this.gameConstansts.gameHeight);
        });

        Object.keys(this.game.playersRespawn).forEach(key => {
            let element = this.game.playersRespawn[key];
            objectDrawFunctions.playerDismantle(element,canvas);
        });
    }

    updateEntityStates(){
        let playersShifted = [];
        let playersDefeated = [];

        Object.keys(this.game.playerEntities).map(playerIndex => {
            let playerObject = this.game.playerEntities[playerIndex];

            playerObject = physActions.playerMovements(playerObject);

            if(playerObject.moveX < 0){
                playerObject.facingLeft = true;
            }
            else if(playerObject.moveX > 0){
                playerObject.facingLeft = false;
            }

            let platformCollisions = physActions.getPlatformCollisions(playerObject,this.game.areaPlatforms);

            if(platformCollisions.length > 0){
                playerObject = physActions.platformCollisionsAction(platformCollisions,playerObject)
            }
            else{
                playerObject = physActions.playerMovementCheck(playerObject,this.gameConstansts.playerMoveSpeed)
            }

            playerObject = physActions.playerGroundDetectionAction(playerObject,this.gameConstansts.gameHeight)

            let sideCollision = physActions.displaySideCollision(playerObject,this.gameConstansts.gameWidth);

            if(sideCollision.collision){
                playerObject.x = sideCollision.x;

                if(sideCollision.left && this.displayDetails.leftDisplay){
                    this.getControllerConnections()[playerIndex].dataChannel.send(JSON.stringify({shiftDisplay:this.displayDetails.leftDisplay}))
                    this.getDisplayConnections()[this.displayDetails.leftDisplay].dataChannel.send(JSON.stringify({shiftedPlayer:playerIndex}))
                    if(!playersShifted.find( player => player == playerObject.id)){
                        playersShifted.push(playerObject.id)
                    }
                }
                else if(sideCollision.right && this.displayDetails.rightDisplay){
                    this.getControllerConnections()[playerIndex].dataChannel.send(JSON.stringify({shiftDisplay:this.displayDetails.rightDisplay}))
                    this.getDisplayConnections()[this.displayDetails.rightDisplay].dataChannel.send(JSON.stringify({shiftedPlayer:playerIndex}))
                    if(!playersShifted.find( player => player == playerObject.id)){
                        playersShifted.push(playerObject.id)
                    }
                }
            }

            let portalCollision = physActions.portalCollisions(playerObject,this.game.portals)
            let playerBattles = physActions.checkPlayerInteractions(playerObject,this.game.playerEntities)

            if(portalCollision){
                //send off controller to other display
                this.getControllerConnections()[playerIndex].dataChannel.send(JSON.stringify({shiftDisplay:portalCollision.destination}))
                this.getDisplayConnections()[portalCollision.destination].dataChannel.send(JSON.stringify({shiftedPlayer:playerIndex}))

                if(!playersShifted.find( player => player == playerObject.id)){
                    playersShifted.push(playerObject.id)
                }
            }
            else if(playerBattles) {
                //will want this to say who defeated who
                console.log("player "+playerObject.id+" defeated");
                playersDefeated.push(playerObject.id)
            }

            this.game.playerEntities[playerIndex] = playerObject;
        });

        //playerRemoval()   //could logically combine the two
        this.playerDeletingAction(playersShifted)
        this.playerDismantlingAction()

        this.playerDefeatedSwitch(playersDefeated)
        this.playerDefeatedAnimate()
    }

    playerDeletingAction(playersShifted){
        playersShifted.forEach( (keyToDelete)=>{

            this.game.playersDeleting[keyToDelete] = this.game.playerEntities[keyToDelete];
            delete this.game.playerEntities[keyToDelete];
        })
    }

    playerDismantlingAction(){
        //still dont think im doing this is a good way
        let playersDeletingKeys = Object.keys(this.game.playersDeleting)
        playersDeletingKeys.forEach( (key)=>{
            if(objectDrawFunctions.isPlayerDismantled(this.game.playersDeleting[key])){
                delete this.game.playersDeleting[key];
            }
        })
    }

    playerDefeatedSwitch(playersDefeated){
        //Alternative is to give the objects a
        playersDefeated.forEach( (keyToMove)=>{
            this.game.playersRespawn[keyToMove] = this.game.playerEntities[keyToMove];
            delete this.game.playerEntities[keyToMove];
        })
    }

    playerDefeatedAnimate(){
        let playersRespawningKeys = Object.keys(this.game.playersRespawn)
        playersRespawningKeys.forEach( (key)=>{
            if(objectDrawFunctions.isPlayerDismantled(this.game.playersRespawn[key])){
                this.addPlayerEntity(key)
                delete this.game.playersRespawn[key];
            }
        })
    }
}

//it was still working without this being declared globaly somehow
let p2pConnectionTesting = null;

/*---------------------interaction engine----------------------*/
const physActions = new ObjectInteractions()
/*---------------------interaction engine----------------------*/

//needs to sort stuff out else where
let g;

//Alter this to call a seperate function that sets a global object of the gamestate
//or have this done in the top file and have it decide the draw and inter objects interations code
// document.addEventListener("DOMContentLoaded",setupDisplayArea);
document.addEventListener("DOMContentLoaded",
()=>{
    
    g = new gameDisplay();

    g.setupDisplayArea()

    let menuButton = document.getElementById("menuSection")

    let aFunction = ()=>{
        g.menuStateToggle(true)

        //this just feels wrong
        menuButton.removeEventListener("click",aFunction,true)
        menuButton.removeEventListener("click",aFunction,false)
    }

    //This isnt being removed when the menu change is happening.
    menuButton.addEventListener("click",aFunction)
});

