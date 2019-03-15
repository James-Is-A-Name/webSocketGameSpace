


//simple test to see if multiple js files can be kept relativly contained
    //will want to make it a class at somepoint
const objectDrawFunctions = {

    refreshCanvas:(canvas,gameWidth,gameHeight)=>{
        canvas.clearRect(0,0,gameWidth,gameHeight);
        
        canvas.beginPath();
        canvas.rect(0,0,gameWidth,gameHeight);
        canvas.stroke();
    },

    drawPerson: (playerObject,canvas) =>{

        if(!(playerObject.stepState > 0)) {playerObject.stepState = 1}

        playerObject.playerDismantleState = 0;
        
        let x = playerObject.x;
        let y = playerObject.y;
        let width = playerObject.width;
        let height = playerObject.height;

        let xCenter = x + width/2;
        let yCenter = y + height/2;
        let size = height/8;


        canvas.beginPath();


        canvas.moveTo(xCenter+size,y+size);
        canvas.arc(xCenter,y+size,size,0,Math.PI*2);
        canvas.moveTo(xCenter,y+size*2);
        canvas.lineTo(xCenter,y+height*0.7);

        let playerWalking = false;
        let playerStanding = false;

        // if(y > gameHeight - height*1.2){
        if(playerObject.moveY < 1.1 && playerObject.moveY > -1.1){
            if(playerObject.moveX > 0 || playerObject.moveX < 0){
                playerWalking = true;
            }
            else{
                playerStanding = true;
            }
        }

        if(playerWalking){
            canvas.moveTo(xCenter+(size *playerObject.stepState/10),y + height);
            canvas.lineTo(xCenter+(size *playerObject.stepState/20),y + height-(height*0.3));
            canvas.lineTo(xCenter,y+height*0.7);
            canvas.lineTo(xCenter-(size *playerObject.stepState/20),y + height-(height*0.3));
            canvas.lineTo(xCenter-(size *playerObject.stepState/10),y + height);
        }
        else if(playerStanding){
            canvas.moveTo(xCenter+(size),y + height);
            canvas.lineTo(xCenter+(size),y + height-(height*0.3));
            canvas.lineTo(xCenter,y+height*0.7);
            canvas.lineTo(xCenter-(size),y + height-(height*0.3));
            canvas.lineTo(xCenter-(size),y + height);
        }
        else{
            canvas.moveTo(xCenter+size,y+height*1.2);
            canvas.lineTo(xCenter+size,y+height*0.9);
            canvas.lineTo(xCenter,y+height*0.7);
            canvas.lineTo(xCenter-size,y+height*0.9);
            canvas.lineTo(xCenter-size,y+height*1.2);
        }

        canvas.stroke()
        
        let previousColor = canvas.strokeStyle;

        if(playerObject.stance == 0){
            canvas.strokeStyle = "rgb(255,0,0)"
        }
        else if(playerObject.stance == 1){
            canvas.strokeStyle = "rgb(0,255,0)"
        }
        else{
            canvas.strokeStyle = "rgb(0,0,255)"
        }

        canvas.beginPath();

        objectDrawFunctions.drawWeapon(canvas,playerObject.facingLeft,playerObject.stance,xCenter,y+height/3,width)

        canvas.stroke()

        canvas.strokeStyle = previousColor;

        playerObject.stepState ++
        if(playerObject.stepState > 10){
            playerObject.stepState = 1
        }
    },

    drawWeapon: (canvas,direction,stance,xCenter,yCenter,width)=>{
        let polarity = direction? -1 : 1;

        canvas.moveTo(xCenter,yCenter);
        canvas.lineTo(xCenter+polarity*width,yCenter);

        if(stance == 0){
            //sword
            canvas.moveTo(xCenter+polarity*(width-3),yCenter+3);
            canvas.lineTo(xCenter+polarity*(width+10),yCenter-10);
        }
        else if(stance == 1){
            //shield
            canvas.moveTo(xCenter+polarity*width,yCenter);
            let arcBase = Math.PI/2 - polarity*Math.PI/2 
            canvas.arc(xCenter-polarity*width,yCenter,2*width,arcBase-Math.PI/5,arcBase+Math.PI/5);
        }
        else{
            //bow
            canvas.moveTo(xCenter-polarity*width/2,yCenter);
            let arcBase = Math.PI/2 - polarity*Math.PI/2
            canvas.arc(xCenter-polarity*width*2,yCenter,3*width,arcBase-Math.PI/8,arcBase+Math.PI/8);
            canvas.lineTo(xCenter-polarity*width/2,yCenter);
        }
    },

    isPlayerDismantled: (playerObject)=>{
        
        //this total frames needs to match up with the one in playerDismatle. more drive to make it a class
        let totalNumFrames = 30;
        return playerObject.playerDismantleState >= totalNumFrames
    },

    playerDismantle: (playerObject,canvas)=>{

        //this will hopefullt catch null and undefined as well
        if(playerObject.playerDismantleState > 0){
        }
        else{
            playerObject.playerDismantleState = 1
        }

        let totalNumFrames = 30;
        let offsetMax = 60;
        let offset = offsetMax*playerObject.playerDismantleState/totalNumFrames;

        if(playerObject.playerDismantleState <= totalNumFrames){

            let x = playerObject.x;
            let y = playerObject.y;
            let width = playerObject.width;
            let height = playerObject.height;
            
            let size = height/8;

            let xCenter = x + width/2;
            let yCenter = y + height/2;
        
            canvas.beginPath();

            let previousColor = canvas.strokeStyle;

            if(playerObject.stance == 0){
                canvas.strokeStyle = "rgb(255,0,0)"
            }
            else if(playerObject.stance == 1){
                canvas.strokeStyle = "rgb(0,255,0)"
            }
            else{
                canvas.strokeStyle = "rgb(0,0,255)"
            }

            canvas.moveTo(xCenter+size+offset, y+size+offset);
            canvas.arc(xCenter+offset, y+size+offset, size, 0, Math.PI*2);
            
            canvas.moveTo(xCenter,y+size*2);
            canvas.lineTo(xCenter,y+height*0.7);

            if(y > gameHeight - height*1.2){
                canvas.moveTo(xCenter+size-offset,gameHeight-offset);
                canvas.lineTo(xCenter+size-offset,gameHeight-(height*0.3)-offset);

                canvas.moveTo(xCenter+size+offset,gameHeight-(height*0.3));
                canvas.lineTo(xCenter+offset,y+height*0.7);

                canvas.moveTo(xCenter-offset,y+height*0.7);
                canvas.lineTo(xCenter-size-offset,gameHeight-(height*0.3));
                
                canvas.moveTo(xCenter-size,gameHeight-(height*0.3)-offset);
                canvas.lineTo(xCenter-size,gameHeight-offset);
            }
            else{
                canvas.moveTo(xCenter+size,y+height*1.2);
                canvas.lineTo(xCenter+size,y+height*0.9);

                canvas.moveTo(xCenter+size,y+height*0.9);
                canvas.lineTo(xCenter+offset,y+height*0.7);

                canvas.moveTo(xCenter+offset,y+height*0.7);
                canvas.lineTo(xCenter-size-offset,y+height*0.9);

                canvas.moveTo(xCenter-size-offset,y+height*0.9);
                canvas.lineTo(xCenter-size,y+height*1.2+offset);
            }
            canvas.stroke()
        
            canvas.strokeStyle = previousColor;

            if(playerObject.playerDismantleState < totalNumFrames){
                playerObject.playerDismantleState++;
            }
        }
    },

    clearPlayerObject: (playerObject,canvas) =>{
        
        let x = playerObject.x;
        let y = playerObject.y;
        let width = playerObject.width;
        let height = playerObject.height;
        
        canvas.beginPath();
        //could be better refined as these are just to 
        if(playerObject.playerDismantleState){
            canvas.clearRect(x-width*5, y-height/2, width*11, height*3);
        }
        else{
            canvas.clearRect(x-20, y-20, width+40, height*1.4+20);
        }
        canvas.stroke();
    },

    drawPortal: (portal,canvas) =>{
        canvas.beginPath();
        canvas.arc(portal.x,portal.y,20,0,Math.PI*2);
        canvas.font = "20px Verdana"
        canvas.fillText(portal.destination,portal.x,portal.y);
        canvas.stroke();
    },

    drawPortals: (canvas,portals) =>{
        portals.forEach((portal) => {
            // objectDrawFunctions.drawPortal(portal,canvas)
            //This feels icky
            objectDrawFunctions.drawPortal(portal,canvas)
        })
    },

    drawPlatform: (platform,canvas) =>{
        canvas.beginPath();
        canvas.rect(platform.x,platform.y,platform.width,platform.height);
        canvas.stroke();
    },
    
    drawPlatforms: (canvas,platforms) =>{
        platforms.forEach((platform)=>{
            objectDrawFunctions.drawPlatform(platform,canvas)
        })
    },

    clearPlatform: (platform,canvas) => {
        canvas.beginPath();
        canvas.clearRect(platform.x-2,platform.y-2,platform.width+4,platform.height+4)
        canvas.stroke();
    }
}
