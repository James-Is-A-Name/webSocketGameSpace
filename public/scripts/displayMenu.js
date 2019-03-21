




function swapMenuContent(show,menuElement,portals,serverComs){
    // let menuElement = document.getElementById("menuElement")

    let menuElementContents = []
    menuElement.childNodes.forEach( (element)=>{
        menuElementContents.push(element);
    })

    menuElementContents.forEach((element)=>{
        menuElement.removeChild(element)
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
                p2pConnect(parseInt(value))
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

        menuElement.appendChild(newButton);
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
        
        p2pTargetForm.appendChild(menuLineBreak);

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

        let newButton = document.createElement("button");
        newButton.title = "Options menu";
        newButton.innerHTML = newButton.title;
        newButton.onclick = () => {swapMenuContent(true)};

        menuElement.className = "menuHidingSection"

        menuElement.appendChild(newButton);
    }
}