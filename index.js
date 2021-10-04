const express = require("express");
const app = express();

const port = 3000;
const origin = "http://localhost:8080";

var stats = {
  connections: [],
  messages: []
};

const server = app.listen(port, () => {
  console.log("Server listening for requests on port " + port);
});

const io = require("socket.io")(server, {
  cors: {
    origin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  stats.connections.push({ id: socket.id });
  console.log(
    stats.connections.length,
    "✅",
    socket.id,
    socket.handshake.address
  );


  socket.emit("greetings", "Hello from the backend!");
  socket.emit("current_connected_count", stats.connections.length)
  socket.emit("chat_old_messages", stats.messages)

  // send message to everyone
  socket.on("chat_message", (message) => {
    stats.messages.push({id: socket.id, msg:replaceLineBreaksWithBr(message)})
    io.emit("chat_message", socket.id, replaceLineBreaksWithBr(message))
  })

  socket.on("disconnect", () => {
    stats.connections = stats.connections.filter((el) => el.id !== socket.id);
    console.log(
      stats.connections.length,
      "❌",
      socket.id,
      socket.handshake.address
    );
  });
});

function replaceLineBreaksWithBr(input) {
  return input.replace(/(?:\r\n|\r|\n)/g, "<br>");
}