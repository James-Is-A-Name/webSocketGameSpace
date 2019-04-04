




//possibly change to 
/*
{
    show:,
    menuElement:,
    portals:,
    serverComs:,
    setInteractionType:,
    platformPlaceState:
}

show,
menuElement,
menuShowCallback
{
    displayIds,
    serverComs,
    connectP2p,
    toggleInteractionType,
    platformPlaceState,
    portalPlaceState,
    rightDisplay,
    leftDisplay
}
then a ...info or 
*/
// function swapMenuContent(show,menuElement,displayIds,serverComs,connectP2p,toggleInteractionType,platformPlaceState,portalPlaceState,rightDisplay, leftDisplay){
function swapMenuContent(show,menuElement,menuShowCallback,parameter){

    let displayIds = parameter.displayIds;
    let serverComs = parameter.serverComs;
    let connectP2p = parameter.connectP2p;
    let toggleInteractionType = parameter.toggleInteractionType;
    let platformPlaceState = parameter.platformPlaceState;
    let portalPlaceState = parameter.portalPlaceState;
    let rightDisplay = parameter.rightDisplay;
    let leftDisplay = parameter.leftDisplay;
    let sideDisplayChange = parameter.sideDisplayChange;

    let menuElementContents = []
    menuElement.childNodes.forEach( (element)=>{
        menuElementContents.push(element);
    })

    menuElementContents.forEach((element)=>{
        menuElement.removeChild(element)
    })

    if(show){
        
        // let newButton = document.createElement("button");
        // let menuButton = newButton(title,inner,onclick)
        let menuButton = newButton("Hide Menu","Hide Menu",()=>{menuShowCallback(false)})
        menuButton.style.gridColumn = "2";
        menuButton.style.gridRow = "1";

        let name = platformPlaceState ? "platform draw enabled":"platform draw disabled"
        let platformDrawButton = newButton(name,name,() => {toggleInteractionType("platform")})
        platformDrawButton.style.gridColumn = "1";
        platformDrawButton.style.gridRow = "2";

        name = portalPlaceState ? "portal move enabled":"portal move disabled"
        let portalMoveButton = newButton(name,name,() => {toggleInteractionType("portal")})
        portalMoveButton.style.gridColumn = "2";
        portalMoveButton.style.gridRow = "2";

        let p2pTargetForm = document.createElement("form");
        p2pTargetForm.onsubmit = (event)=>{
            event.preventDefault();

            let value = document.getElementById("connectionTarget").value;
            if(!isNaN(parseInt(value))){
                connectP2p(parseInt(value))
            }
        }
        let p2pTarget = newInput("text","connectionTarget",null)
        p2pTarget.style.width = "100%";
        
        let p2pSubmit = newInput("Submit","connectToPeer","connect to peer")

        p2pTargetForm.style.gridColumn = "3";
        p2pTargetForm.style.gridRow = "2";

        let rightSideDestination = setupSideDestinations("right",rightDisplay,displayIds,sideDisplayChange)
        let leftSideDestination = setupSideDestinations("left",leftDisplay,displayIds,sideDisplayChange)
        
        p2pTargetForm.appendChild(p2pTarget);
        p2pTargetForm.appendChild(p2pSubmit);

        menuElement.appendChild(menuButton);
        menuElement.appendChild(platformDrawButton);
        menuElement.appendChild(portalMoveButton);
        menuElement.appendChild(p2pTargetForm);
        
        let leftDisplayState = document.createElement("span");
        leftDisplayState.innerHTML = "left side destination";
        let leftBlock = document.createElement("div");
        leftBlock.appendChild(leftDisplayState);
        leftBlock.appendChild(leftSideDestination);
        
        leftBlock.style.gridColumn = "1";
        leftBlock.style.gridRow = "3";
        menuElement.appendChild(leftBlock);
        
        let rightDisplayState = document.createElement("span");
        rightDisplayState.innerHTML = "right side destination"
        let rightBlock = document.createElement("div");
        rightBlock.appendChild(rightDisplayState)
        rightBlock.appendChild(rightSideDestination);
        
        rightBlock.style.gridColumn = "3";
        rightBlock.style.gridRow = "3";
        menuElement.appendChild(rightBlock)
        
        menuElement.className = "menuShowingSection"

    }
    else{
        newButton("Options menu","Options menu",)
        let menuShowButton = document.createElement("button");
        menuShowButton.title = "Options menu";
        menuShowButton.innerHTML = menuShowButton.title;
        menuShowButton.onclick = () => {menuShowCallback(true)};

        menuElement.className = "menuHidingSection"

        menuElement.appendChild(menuShowButton);
    }
}


function newInput(type,id,value){
    let anInput = document.createElement("input");

    anInput.type = type;
    anInput.id = id;
    if(value){
        anInput.value = value;
    }

    return anInput
}
function newButton(title,text,onclick){
    let aButton = document.createElement("button");

    aButton.title = title;
    aButton.innerHTML = text;
    aButton.onclick = onclick;

    return aButton
}

function setupSideDestinations(side,currentDestination,possibleDestinations,sideDisplayChange){

    let sideDestination = document.createElement("select");
    if(side == "left"){
        sideDestination.id = "leftSideDestination"
    }
    else{
        sideDestination.id = "rightSideDestination"
    }

    sideDestination.onchange = (e)=>{
        sideDisplayChange(side,e.target.value)
    }
    
    let displayOption = document.createElement("option");
    displayOption.value = currentDestination ? currentDestination : null;
    displayOption.innerHTML = currentDestination ? currentDestination : "none";
    sideDestination.appendChild(displayOption);

    possibleDestinations.forEach((destination)=>{
        displayOption = document.createElement("option");
        displayOption.value = destination;
        displayOption.innerHTML = destination;
        sideDestination.appendChild(displayOption);
    })
    
    sideDestination.value = currentDestination;
    
    return sideDestination
}