
let webSocket = require("ws").Server;


//This is not safe, would need atomic interaction
let idRefNumber = 1;

//this should just be an object/class thing
let webSocketsConnected = []

function webSocketSetup(portNum , completedCallback){

    let webSocketServer = new webSocket({port:portNum});
    
    webSocketServer.on("connection",(ws)=>{
        //This should be atomic or handed off to a locking function or something
            //except node might be single thread based. still dosent feel nice
        let id = idRefNumber;
        idRefNumber++;
        
        let theWebsocket = {
            id,
            ws,
            isDisplay: false,
            ended: false
        }

        webSocketsConnected.push(theWebsocket);

        //TEST MOVEMENT
        // let simpleLoop = setInterval( ()=>{
        //     if(ws.readyState == 1){
        //         ws.send(JSON.stringify({moveRight:true}))
        //     }
        //     else{
        //         clearInterval(simpleLoop);
        //     }
        // },1000)
        //END OF TEST MOVEMENT


        ws.on("message",(message)=>{
            let theMessage = JSON.parse(message);

            console.log("got message of ",message)

            if(theMessage.actAsDisplay){
                theWebsocket.isDisplay = true;
                console.log("display connected");
            }
            else{
                let aDisplay = webSocketsConnected.find((connection)=>{
                    return connection.isDisplay
                })

                if(aDisplay){
                    theMessage.id = webSocket.id;
                    aDisplay.ws.send(JSON.stringify(theMessage));
                }
            }
        })
    })

    completedCallback();
}




module.exports = {
    start: webSocketSetup
}