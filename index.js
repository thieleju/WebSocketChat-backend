const express = require("express");
const app = express();

const port = 4200;
const origin = "http://localhost:8080";

var stats = {
  connections: [],
};

const server = app.listen(port, () => {
  console.log("listening for requests on port " + port);
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

  socket.on("chat_message", (message) => {
    io.emit("chat_message", socket.id, message)
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

