


class ObjectInteractions{

    constructor(){
        //this is actually pointless
    }

    /* ---------------------- MOVE TO ObjectInteractions             -------------------------------*/
    //very inefficient at the moment
    checkPlayerInteractions(player,players){

        //shorted but way more obtuse
        return ( Object.keys(players).filter(playerIndex => {
            return this.playersFight(player,players[playerIndex]) == players[playerIndex].id
        }) > 0)

        // let results = Object.keys(players).filter(playerIndex => {
        //     return playersFight(player,players[playerIndex]) == players[playerIndex].id
        // })

        // return (results > 0)
    }

    /* ---------------------- MOVE TO ObjectInteractions             -------------------------------*/
    //basically a paper scissors rock thing
    playersFight(player1,player2){

        if(((player1.x + player1.width) < player2.x) || ((player2.x + player2.width) < player1.x)){
            return false;
        }
        if(((player1.y + player1.height) < player2.y) || ((player2.y + player2.height) < player1.y)){
            return false;
        }

        if(player1.stance == player2.stance){
            return false;
        }
        else if(player1.stance == 0 &&  player2.stance == 1){
            return player1.id;
        }
        else if(player1.stance == 1 &&  player2.stance == 2){
            return player1.id;
        }
        else if(player1.stance == 2 &&  player2.stance == 0){
            return player1.id;
        }
        else{
            return player2.id;
        }
    }

    /* ---------------------- MOVE TO ObjectInteractions             -------------------------------*/
    playerMovements(player){
        player.y += player.moveY;
        player.moveY++;
        
        player.x += player.moveX;

        return player
    }

    /* ---------------------- MOVE TO ObjectInteractions             -------------------------------*/
    onPlatform(player,platform){
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

    /* ---------------------- MOVE TO ObjectInteractions             -------------------------------*/
    getPlatformCollisions(player,platforms){
        return platforms.reduce( (collisions,platform) => {
            let collisonResult = this.onPlatform(player,platform);
            if(collisonResult){
                collisions.push(collisonResult)
            }
            return collisions;
        },[]);
    }
    // function getPlatformCollisions(playerObject){
    //     return areaPlatforms.reduce( (prev,platform,i) => {
    //         let result = onPlatform(playerObject,platform);
    //         if(result){
    //             prev.push(result)
    //         }
    //         return prev;
    //     },[]);
    // }

    /* ---------------------- MOVE TO ObjectInteractions             -------------------------------*/
    platformCollisionsAction(platformCollisions,player){
        platformCollisions.forEach((platformCollision)=>{
            if(platformCollision.collison == "y"){
                player.y = platformCollision.y;
                player.moveY = 0;
            }
            else if(platformCollision.collison == "x"){
                player.x = platformCollision.x;
                player.moveX = 0;
            }
            else if(platformCollision.collison == "bellow"){
                if(player.moveY < 0){
                    player.moveY = 0;
                }
                player.y = platformCollision.y
            }
        })
        return player;
    }
    // function platformCollisionsAction(platformCollisions,playerObject){
    //     platformCollisions.forEach((platformCollision)=>{
    //         if(platformCollision.collison == "y"){
    //             playerObject.y = platformCollision.y;
    //             playerObject.moveY = 0;
    //         }
    //         else if(platformCollision.collison == "x"){
    //             playerObject.x = platformCollision.x;
    //             playerObject.moveX = 0;
    //         }
    //         else if(platformCollision.collison == "bellow"){
    //             if(playerObject.moveY < 0){
    //                 playerObject.moveY = 0;
    //             }
    //             playerObject.y = platformCollision.y
    //         }
    //     })
    //     return playerObject;
    // }

    /* ---------------------- MOVE TO ObjectInteractions             -------------------------------*/
    displaySideCollisionNoShift(player,gameWidth){
        if(player.x+player.width > gameWidth){
            player.x = gameWidth - player.width;
        }
        else if(player.x < 0){
            player.x = 0
        }
        return player
    }
    // function displaySideCollisionNoShift(playersShifted,playerObject,playerIndex){
    //     if(playerObject.x+playerObject.width > gameWidth){
    //         playerObject.x = gameWidth - playerObject.width;
    //     }
    //     else if(playerObject.x < 0){
    //         playerObject.x = 0
    //     }
    //     return playerObject
    // }
    /* ---------------------- MOVE TO ObjectInteractions             -------------------------------*/
    displaySideCollision(player){

        //TODO
            //requires some method of asigning what the next screen along is when multiple or non are connected
        return false
    }
    // function displaySideCollision(playersShifted,playerObject,playerIndex){

    //     //TODO
    //         //requires some method of asigning what the next screen along is when multiple or non are connected
    //     return false
    // }

    /* ---------------------- MOVE TO ObjectInteractions             -------------------------------*/
    portalCollisons(player,portals){
        
        let portalCollision = portals.find((portal) => {
            if(( Math.abs(player.x + player.width/2 - portal.x) < 20) && (Math.abs(player.y + player.height/2 - portal.y) < 20 )){
                return true;
            }
        })

        if(portalCollision){
            return {player:player.id,destination:portalCollision.destination}
        }
        return false
    }
    // function portalCollisons(playersShifted,playerObject,playerIndex){

    //     let portalCollision = portals.find((portal) => {
    //         if(( Math.abs(playerObject.x + playerObject.width/2 - portal.x) < 20) && (Math.abs(playerObject.y + playerObject.height/2 - portal.y) < 20 )){
    //             if(!playersShifted.find( player => player == playerIndex)){
    //                 return true;
    //             }
    //         }
    //     })

    //     if(portalCollision){

    //         controllerConnections[playerIndex].dataChannel.send(JSON.stringify({shiftDisplay:portalCollision.destination}))
    //         displayConnections[portalCollision.destination].dataChannel.send(JSON.stringify({shiftedPlayer:playerIndex}))

    //         return true
    //     }
    //     return false
    // }
}