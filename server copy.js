require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const fs = require("fs");

// Import Routes
const auths = require("./routes/authentication");
const googleAuth = require("./routes/googleAuth");
const reels = require("./routes/reels");
const wallet = require("./routes/walletRoutes");
const blockchain = require("./routes/blockchain");
const userRoute = require("./routes/userRoutes");
const uploadImages = require("./routes/uploadImages");
const subscribe = require("./routes/subscribe");
const earnWallet = require("./routes/otherWallet");
const transactionRoutes = require("./routes/transactions");
const activityRoutes = require("./routes/activities");
const withdrawalRoutes = require("./routes/withdrawals");
const connectRoutes = require("./routes/connect");
const chatRoutes = require("./routes/chatRoutes");

// Environment Variables
const { PORT } = process.env;
const APP_PORT = PORT || 4000;

const app = express();
const server = http.createServer(app);

// Socket.IO Setup
const io = socketIo(server, {
  cors: { origin: "*" },
});

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ limit: "20mb", extended: true }));
app.use(
  session({
    secret: process.env.GOOGLE_CLIENT_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// Serve Static Files
app.use(express.static(path.join(__dirname, "dist")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// // SPA Fallback for Non-API Routes
// app.get(/^\/(?!api).*/, (req, res) => {
//   const filePath = path.join(__dirname, "dist", "index.html");
//   if (fs.existsSync(filePath)) {
//     res.sendFile(filePath);
//   } else {
//     console.error("index.html not found at:", filePath);
//     res.status(404).send("index.html not found");
//   }
// });

// Socket.IO Events
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("join", (conversationId) => socket.join(conversationId));

  socket.on("sendMessage", (messageData) => {
    const { conversationId, message } = messageData;
    io.to(conversationId).emit("receiveMessage", message);
  });

  socket.on("conversationStatusUpdate", (data) => {
    const { conversationId, status } = data;
    io.to(conversationId).emit("conversationStatusUpdate", {
      conversationId,
      status,
    });
  });

  socket.on("disconnect", () => console.log("Client disconnected"));
});

// API Routes
app.get("/", (req, res) => res.send("<h1>Starface Backend is working</h1>"));
app.use("/api/auths", auths);
app.use("/api/auth", googleAuth);
app.use("/api/reel", reels);
app.use("/api/wallet", wallet);
app.use("/api/blockchain", blockchain);
app.use("/api/user", userRoute);
app.use("/api/images", uploadImages);
app.use("/api/subscribe", subscribe);
app.use("/api/earn", earnWallet);
app.use("/api/transaction", transactionRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/connect", connectRoutes);
app.use("/api/chat", chatRoutes(io));
app.use("/api/trans", withdrawalRoutes);

// Database Connection
require("./dbconfig/db").connect();

// Global Error Handling Middleware
app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      if (err) console.error(err);
    });
  }
  if (res.headersSent) return next(error);

  res
    .status(error.code || 500)
    .json({ message: error.message || "An unknown error occurred!" });
});

// Start Server
server.listen(APP_PORT, () => {
  console.log(`Server started on port ${APP_PORT}`);
});
