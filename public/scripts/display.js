document.addEventListener("DOMContentLoaded",setupDisplayArea);

    let entitieSize = 50;
    //should not make this 
    var gameHeight = document.documentElement.clientHeight - entitieSize;
    var gameWidth = document.documentElement.clientWidth - entitieSize;

    var serverConnection;

    //Will want to make this an object of objects not an array
        //alter elsewher eto itterate over the keys
    var playerEntities={};

    function setupDisplayArea(){
        //set width and height and connect to the server
        
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
        serverConnection = new WebSocket(`ws://${serverIp}:43211`);
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
                //this should enforce unique ids
                let newPlayer = {
                    id:theMessage.newPlayerId,
                    x:gameWidth/2,
                    // x:0,
                    y:gameHeight - entitieSize,
                    moveY:0,
                    width:entitieSize,
                    height:entitieSize,
                }
                playerEntities[theMessage.newPlayerId] = newPlayer;
            }
            else if(! Object.keys(playerEntities).find( (key)=> {return key == theMessage.id})){

                // for now just make a new ertrie in it
                let newPlayer = {
                    id:theMessage.id,
                    x:gameWidth/2,
                    // x:0,
                    y:gameHeight - entitieSize,
                    moveY:0,
                    width:entitieSize,
                    height:entitieSize,
                }

                playerEntities[theMessage.id] = newPlayer;
            }
            else if(theMessage.moveRight){
                playerEntities[theMessage.id].x += 10;
            }
            else if(theMessage.moveLeft){
                playerEntities[theMessage.id].x -= 10;
            }
            else if(theMessage.actionDo){
                playerEntities[theMessage.id].moveY = -20;
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


    function drawPerson(x,y,width,height,canvas){

        let xCenter = x + width/2;
        let yCenter = y + height/2;
        let size = height/8;
        if(width < height){
            size = width/8;
        }

        canvas.moveTo(xCenter+size,y+size);
        canvas.arc(xCenter,y+size,size,0,Math.PI*2);
        canvas.moveTo(xCenter,y+size*2);
        canvas.lineTo(xCenter,y+height*0.7);

        if(y > gameHeight - height*1.2){
            canvas.moveTo(xCenter+size,gameHeight);
            canvas.lineTo(xCenter+size,gameHeight-(height*0.3));
            canvas.lineTo(xCenter,y+height*0.7);
            canvas.lineTo(xCenter-size,gameHeight-(height*0.3));
            canvas.lineTo(xCenter-size,gameHeight);
        }
        else{
            canvas.moveTo(xCenter+size,y+height*1.2);
            canvas.lineTo(xCenter+size,y+height*0.9);
            canvas.lineTo(xCenter,y+height*0.7);
            canvas.lineTo(xCenter-size,y+height*0.9);
            canvas.lineTo(xCenter-size,y+height*1.2);
        }
        
    }

    function startGame(){
        setInterval(gameStep,20);
    }

    function gameStep(){
        let displayElement = document.getElementById("canvasArea");
        let canvasDraw = displayElement.getContext("2d");

        let playersShifted = [];
        Object.keys(playerEntities).map(key => {
            let element = playerEntities[key];

            element.y += element.moveY;
            element.moveY++;

            if (element.y > (gameHeight - entitieSize)){
                element.y = (gameHeight - entitieSize);
                if(element.moveY > 0){
                    element.moveY = 0;
                }
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
            delete playerEntities[keyToDelete];
        })

         //the draw part   
        canvasDraw.clearRect(0,0,gameWidth,gameHeight);
        
        canvasDraw.beginPath();
        canvasDraw.rect(0,0,gameWidth,gameHeight);

        Object.keys(playerEntities).forEach(key => {
            let element = playerEntities[key];
            // canvasDraw.rect(element.x,element.y,element.width,element.height);
            canvasDraw.fillText(element.id,element.x,element.y)
            drawPerson(element.x,element.y,element.width,element.height,canvasDraw);
        });

        canvasDraw.stroke();
    }