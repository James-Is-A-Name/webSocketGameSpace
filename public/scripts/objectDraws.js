


//simple test to see if multiple js files can be kept relativly contained
    //will want to make it a class at somepoint
const objectDrawFunctions = {

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

        canvas.moveTo(xCenter+size,y+size);
        canvas.arc(xCenter,y+size,size,0,Math.PI*2);
        canvas.moveTo(xCenter,y+size*2);
        canvas.lineTo(xCenter,y+height*0.7);

        if(y > gameHeight - height*1.2){
            if(playerObject.moveX > 0 || playerObject.moveX < 0){
                canvas.moveTo(xCenter+(size *playerObject.stepState/10),gameHeight);
                canvas.lineTo(xCenter+(size *playerObject.stepState/20),gameHeight-(height*0.3));
                canvas.lineTo(xCenter,y+height*0.7);
                canvas.lineTo(xCenter-(size *playerObject.stepState/20),gameHeight-(height*0.3));
                canvas.lineTo(xCenter-(size *playerObject.stepState/10),gameHeight);
            }
            else{
                
                canvas.moveTo(xCenter+(size),gameHeight);
                canvas.lineTo(xCenter+(size),gameHeight-(height*0.3));
                canvas.lineTo(xCenter,y+height*0.7);
                canvas.lineTo(xCenter-(size),gameHeight-(height*0.3));
                canvas.lineTo(xCenter-(size),gameHeight);
            }
        }
        else{
            canvas.moveTo(xCenter+size,y+height*1.2);
            canvas.lineTo(xCenter+size,y+height*0.9);
            canvas.lineTo(xCenter,y+height*0.7);
            canvas.lineTo(xCenter-size,y+height*0.9);
            canvas.lineTo(xCenter-size,y+height*1.2);
        }

        playerObject.stepState ++
        if(playerObject.stepState > 10){
            playerObject.stepState = 1
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
                // canvas.moveTo(xCenter-size,gameHeight);

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

            if(playerObject.playerDismantleState < totalNumFrames){
                playerObject.playerDismantleState++;
            }
        }
    }
}
