//p2p connection stuff




function getAWebRTC(){

    let connectionObject = {};
    let somethingWentWrong = false;

    connectionObject.connection = new RTCPeerConnection();
    
    //this might not be the best
    connectionObject.dataChannel = connectionObject.connection.createDataChannel("datachannel");

    connectionObject.connection.onicecandidate = (data) => {

        console.log("ice canditae change",data)
        //this feels all kinda janky
        if(connectionObject.sendOffer && connectionObject.whoTo && connectionObject.sendOfferFunction){
            //send this somewhere
            let offer = JSON.stringify(connectionObject.connection.localDescription)
            //Maybe put this in the .oniceconnectionstatechange part
                //or use connectionObject.connection.iceConnectionState == "completed"

            connectionObject.offerToSend = offer;
            connectionObject.offerCreated = true;

            //this is a half hearted way of doing this
            connectionObject.sendOffer = false;

            console.log("description after offer is ",connectionObject.connection.localDescription)

            connectionObject.sendOfferFunction();
        }
        else if(connectionObject.sendAnswer){

            let answer = JSON.stringify(connectionObject.connection.localDescription)
            
            connectionObject.answerToSend = answer;
            connectionObject.answerCreated = true;

            //this is a half hearted way of doing this
            connectionObject.sendAnswer = false;
        }
    };
    connectionObject.connection.onnremovestream = () => {
        // console.log("stream removed. probably not a good thing in this simple application");
    };
    connectionObject.connection.oniceconnectionstatechange = () => {
        // console.log("handleICEConnectionStateChangeEvent",connectionObject.connection.iceConnectionState);
    };
    connectionObject.connection.onicegatheringstatechange = () => {
        //This will probably have greater importance when a turn/stun server is required
        // console.log("handleICEGatheringStateChangeEvent",connectionObject.connection.iceGatheringState);
    };
    connectionObject.connection.onsignalingstatechange = () => {
        //this refers to the connection overall not an individual channel. at least the signalingState does
        // console.log("handleSignalingStateChangeEvent",connectionObject.connection.signalingState);
    };
    connectionObject.connection.onnegotiationneeded = () => {
        //Will want to check this to see where it is needed as its probably a unideal world type situation
        // console.log("handleNegotiationNeededEvent -------------------");
    };

    connectionObject.connection.ondatachannel = (event) => {
        console.log("data channel on happened",event)
        // event.channel.onmessage = (message) => {
        //     console.log("got message ",message)
        // }
        // connectionObject.dataChannel = event.channel
        connectionObject.dataChannel.onmessage = (message) => {
            console.log("got message ",message)
            let output = document.getElementById("messageOutput")
            output.innerHTML = message.data
        }
        connectionObject.dataChannel.send("hello")
    }


    connectionObject.createOffer = () =>{
        connectionObject.connection.createOffer()
        .then( (offer)=>{
            connectionObject.sendOffer = true;
            connectionObject.whoTo = "Does not matter in this testing"
            connectionObject.connection.setLocalDescription(offer);

            console.log("setting up an offer to send")
        })
    }
    connectionObject.acceptOffer = (offer) => {
        connectionObject.connection.setRemoteDescription(offer)
        
        //might need somesort of wait here
        return connectionObject.connection.createAnswer()
        .then( (answer)=>{
            connectionObject.sendAnswer = true;
            return connectionObject.connection.setLocalDescription(answer)
        })
    }
    connectionObject.acceptAnswer = (answer) => {
        connectionObject.connection.setRemoteDescription(answer)
    }

    //probably not the best way of doing this
    if(somethingWentWrong){
        return false;
    }

    return connectionObject;
}

//setupWebRTC(who)
    //creates a an offer and sends it off to the server to connect it up with the other end. if it exists
        //will want to make something to trigger on the ice setup and send at that point.
            //will be done with the web socket probably
// function createOffer(){
    // localConnection.createOffer()
    // .then(offer=>localConnection.setLocalDescription(offer))


    //this requires a delay as the ice candidates only get setup after the offer has been created.
// function sendTheOffer(){
    // fetch("/sendOffer",{
    //     method: "POST",
    //     headers: {"Content-Type": "application/json"},
    //     body: JSON.stringify(localConnection.localDescription)
    // })



//webRTCSetupReponse()
    //server will respond with an answer or a message saying it dont exist

//p2pSetup()
    //using the answer/offer setup a webrtc connection

//will want to make the controls and player setup less picky and generally workable