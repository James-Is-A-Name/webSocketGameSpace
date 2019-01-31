const express = require("express")
const server = express()

const port = process.env.PORT || 3000;

server.use(express.json())
server.use(express.static(__dirname+"/../public"))


server.listen(port,function(){
    console.log(`Server started on port ${port}`)
})
