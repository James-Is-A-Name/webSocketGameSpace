//p2p connection stuff




function getAWebRTC(){

    let connectionObject = {};
    let somethingWentWrong = false;

    connectionObject.connection = new RTCPeerConnection();
    
    //this might not be the best
    connectionObject.dataChannel = connectionObject.connection.createDataChannel("commsThing");

    connectionObject.connection.onicecandidate = (data) => {

        // console.log("ice canditae change",data)
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

            // console.log("description after offer is ",connectionObject.connection.localDescription)

            connectionObject.sendOfferFunction();
        }
        else if(connectionObject.sendAnswer){

            let answer = JSON.stringify(connectionObject.connection.localDescription)
            
            connectionObject.answerToSend = answer;
            connectionObject.answerCreated = true;

            //this is a half hearted way of doing this
            connectionObject.sendAnswer = false;
            connectionObject.sendAnswerFunction();
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

    connectionObject.handleMessage = (message)=>{
        console.log("default message handle function, got ",message)
    }

    connectionObject.dataChannelSetupCallback = ()=>{
        console.log("default callback of dataChannelSetup")
    }

    connectionObject.connection.ondatachannel = (event) => {

        if(connectionObject.answerCreated){
            connectionObject.dataChannel = event.channel
        }

        connectionObject.dataChannelSetupCallback();

        connectionObject.dataChannel.onmessage = (message) => {
            connectionObject.handleMessage(message,connectionObject.connectionId)
        }
    }


    connectionObject.createOffer = () =>{
        connectionObject.connection.createOffer()
        .then( (offer)=>{
            connectionObject.sendOffer = true;
            connectionObject.whoTo = "Does not matter in this testing"
            connectionObject.connection.setLocalDescription(offer);
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
