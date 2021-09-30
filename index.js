const express = require("express");
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const port = 3000;


io.on('connection', (socket) => {
    
});


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
  