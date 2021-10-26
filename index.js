const express = require("express");
const app = express();
const fs = require("fs");
const helmet = require("helmet");
// set dynamic env filename
require("dotenv").config({ path: `./.env.${process.env.NODE_ENV}` });

app.use(helmet());

const port = process.env.APP_PORT;
const origin = process.env.APP_ORIGIN;
const maxMessagesPerChannel = process.env.APP_MAX_MESSAGES;

var stats = {
  connections: [],
  messages: [],
};

// TODO delete later
const FPS = 30;
const cv = require("opencv4nodejs");
const wCap = new cv.VideoCapture(0);
wCap.set(cv.CAP_PROP_FRAME_WIDTH, 1280);
wCap.set(cv.CAP_PROP_FRAME_HEIGHT, 720);

// TODO FIX CORS
app.use(require("cors")());

app
  // middleware able to get requestors ip by req.ip
  .set("trust proxy", true)
  // use cors
  .use(express.json())
  .use(
    express.urlencoded({
      extended: true,
    })
  )
  // check if provided data is a valid json to catch unhandled errors
  .use((err, req, res, next) => {
    if (err) {
      res.status(400).json({ status: "error", message: "Invalid request!" });
    }
  });

app.get("/impressum", (req, res) => {
  try {
    var impressum = fs.readFileSync("assets/impressum.html");
    res.send(impressum);
  } catch (error) {
    res.status(400).json(error);
  }
});

app.get("/dsgvo", (req, res) => {
  try {
    var dsgvo = fs.readFileSync("assets/dsgvo.html");
    res.send(dsgvo);
  } catch (error) {
    res.status(400).json(error);
  }
});

app.use("/", (req, res) => {
  res
    .status(200)
    .json({ status: "success", message: "This is the chat.node5.de api" });
});

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
  console.log(
    stats.connections.length,
    "✅",
    socket.id,
    socket.handshake.address
  );

  // TODO delete later
  setInterval(() => {
    const frame = wCap.read();
    const image = cv.imencode(".jpg", frame).toString("base64");
    io.emit("image", image);
  }, 1000 / FPS);

  // add user object
  stats.connections.push({ id: socket.id, username: "", color: "" });

  socket.on("trigger_update", () => {
    // emit channel details for client on Load
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
    io.emit("channel_details", details);
  });

  // listen for message send event
  socket.on("add_message_to_channel", (data) => {
    try {
      var findUser = stats.connections.find((el) => el.id == socket.id);
      var messageObj = {
        socketID: socket.id,
        socketAddress: socket.handshake.address,
        text: replaceLineBreaksWithBr(data.message),
        user: {
          name: findUser.username,
          color: findUser.color,
        },
      };

      // check if messages are at maximum
      var channel = chat.channels.find((el) => data.channelID == el.channelID);
      if (channel.messages.length >= maxMessagesPerChannel) {
        // remove first message to add another at the end
        channel.messages.shift();
        channel.messages.push(messageObj);
      } else {
        channel.messages.push(messageObj);
      }
      // apply changes to array
      chat.channels.find((el) => data.channelID == el.channelID).messages =
        channel.messages;

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

  // listen for message updates and emit update
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

  // listen for username change
  socket.on("update_username", (un) => {
    try {
      stats.connections.find((el) => el.id == socket.id).username = un;
      // send new user list
      io.emit("userlist", stats.connections);
    } catch (error) {
      console.log(error);
      io.emit("error", error);
    }
  });

  // listen for color change
  socket.on("update_color", (col) => {
    try {
      stats.connections.find((el) => el.id == socket.id).color = col;
      // send new user list
      io.emit("userlist", stats.connections);
    } catch (error) {
      console.log(error);
      io.emit("error", error);
    }
  });

  // user disconnected
  socket.on("disconnect", () => {
    stats.connections = stats.connections.filter((el) => el.id !== socket.id);
    // send new user list
    io.emit("userlist", stats.connections);
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
