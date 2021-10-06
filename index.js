const express = require("express");
const app = express();

const port = 3000;
const origin = "http://localhost:8080";
const maxMessagesPerChannel = 100;

var stats = {
  connections: [],
  messages: [],
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

var chat = require("./chatSettings.json");

io.on("connection", (socket) => {
  stats.connections.push({ id: socket.id });
  console.log(
    stats.connections.length,
    "✅",
    socket.id,
    socket.handshake.address
  );

  socket.emit("greetings", "Hello from the server!");

  var details = {
    menu_name: chat.menu_name,
    channels: [],
  };
  chat.channels.forEach((el) => {
    details.channels.push({
      id: el.id,
      title: el.title,
      icon: el.icon,
      channelID: el.channelID,
    });
  });
  socket.emit("channel_details", details);

  socket.on("add_message_to_channel", (data) => {
    try {
      var messageObj = {
        socketID: socket.id,
        socketAddress: socket.handshake.address,
        text: replaceLineBreaksWithBr(data.message),
        user: {
          name: data.user.name,
          color: data.user.color,
        },
      };
      // check if messages are at maximum
      var channel = chat.channels.find((el) => data.channelID == el.channelID)
      if (channel.messages.length >= maxMessagesPerChannel) {
        // remove first message to add another at the end
        channel.messages.shift()
        channel.messages.push(messageObj)
      } else {
        channel.messages.push(messageObj)
      }
      // apply changes to array
      chat.channels
        .find((el) => data.channelID == el.channelID).messages = channel.messages

      var updateObj = {
        channelID: data.channelID,
        channel: chat.channels.find((el) => data.channelID == el.channelID),
      };
      io.emit("messages_update_for_channel", updateObj);
    } catch (error) {
      console.log(error);
      io.emit("error", "Something went wrong! " + error);
    }
  });

  socket.on("update_messages_for_channel", (channelID) => {
    try {
      var channel = chat.channels.find((el) => channelID == el.channelID);
      // check if channel exists
      if (channel) {
        var updateObj = {
          channelID,
          channel,
        };
        io.emit("messages_update_for_channel", updateObj);
      }
    } catch (error) {
      console.log(error);
      io.emit("error", error);
    }
  });

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
