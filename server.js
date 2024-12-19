require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const fs = require("fs");
const Notification = require("./models/Notification");

// Import Routes
const auths = require("./routes/authentication");
const googleAuth = require("./routes/googleAuth");
const reels = require("./routes/reels");
const wallet = require("./routes/walletRoutes");
const blockchain = require("./routes/blockchain");
const userRoute = require("./routes/userRoutes");
const uploadImages = require("./routes/uploadImages");
const fileUpload = require("./routes/fileUpload");
const subscribe = require("./routes/subscribe");
const earnWallet = require("./routes/otherWallet");
const transactionRoutes = require("./routes/transactions");
const activityRoutes = require("./routes/activities");
const withdrawalRoutes = require("./routes/withdrawals");
const connectRoutes = require("./routes/connect");
const stakingRoutes = require("./routes/stakingRoutes");
const chatRoutes = require("./routes/chatRoutes");
const streamRoutes = require("./routes/streamRoutes");
const reelsAction = require("./routes/reelActionRoutes");
const promotion = require("./routes/promotion");

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

app.use((req, res, next) => {
  req.io = io;
  next();
});

// Serve Static Files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// app.use(express.static(path.join(__dirname, "dist")));
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

  // Handle messaging events (already present)
  socket.on("join", (conversationId) => socket.join(conversationId));
  socket.on("sendMessage", (messageData) => {
    const { conversationId, message } = messageData;
    io.to(conversationId).emit("receiveMessage", message);
  });

  socket.on("joinNotifications", (userId) => {
    socket.join(userId); // Join a room based on user ID for notifications
    console.log(`User ${userId} joined notifications room`);
  });

  socket.on("conversationStatusUpdate", (data) => {
    const { conversationId, status } = data;
    io.to(conversationId).emit("conversationStatusUpdate", {
      conversationId,
      status,
    });
  });

  // Emit real-time typing status
  socket.on("isTyping", ({ conversationId, userId }) => {
    socket.to(conversationId).emit("isTyping", { userId });
    console.log(`User ${userId} is typing in conversation ${conversationId}`);
  });

  // Fetch all messages for a conversation and emit them
  socket.on("getAllMessages", ({ conversationId, messages }) => {
    io.to(conversationId).emit("allMessages", { conversationId, messages });
    console.log(`All messages emitted for conversation ${conversationId}`);
  });

  // Fetch all conversations for a user and emit them
  socket.on("getAllConversations", ({ userId, formattedConversations }) => {
    io.to(userId).emit("allConversation", { userId, formattedConversations });
    console.log(`All conversations emitted for user ${userId}`);
  });

  // Fetch all notifications for a user and emit them
  // socket.on("getAllNotifications", ({ userId }) => {
  //   io.to(userId).emit("allNotifications", { notifications  });
  //   console.log(`All notifications emitted for user ${userId}`);
  // });
  socket.on("getAllNotifications", async ({ userId }) => {
    try {
      const notifications = await Notification.find({ userId }).sort({
        createdAt: -1,
      });
      io.to(userId).emit("allNotifications", { notifications });
      console.log(`All notifications sent to user ${userId}`);
    } catch (error) {
      console.error("Error fetching notifications for user:", error);
    }
  });

  // Fetch single notifications for a user and emit them
  // socket.on("getSingleNotifications", ({ notificationId }) => {
  //   io.to(notificationId).emit("singleNotifications", { notificationId });
  //   console.log(`Single notification emitted ${notificationId}`);
  // });
  socket.on("getSingleNotifications", async ({ notificationId }) => {
    try {
      const notification = await Notification.findById(notificationId);
      if (notification) {
        notification.isRead = true;
        await notification.save();

        io.to(notification.userId).emit("singleNotifications", {
          notification,
        });

        console.log(`Single notification emitted: ${notificationId}`);
      }
    } catch (error) {
      console.error("Error fetching single notification:", error);
    }
  });

  socket.on("joinReelRoom", (reelId) => {
    socket.join(reelId);
    console.log(`User joined reel room: ${reelId}`);
  }); // Event for joining a user-specific room

  socket.on("joinUploadReelsRoom", (userId) => {
    socket.join(userId); // Join a room named after the userId
    console.log(`User ${userId} joined room`);
  });

  socket.on("leaveReelRoom", (reelId) => {
    socket.leave(reelId);
    console.log(`User left reel room: ${reelId}`);
  });

  // Handle WebRTC signaling events
  socket.on("join-stream", (streamId) => {
    socket.join(streamId);
    console.log(`User ${socket.id} joined stream ${streamId}`);
    socket.to(streamId).emit("user-joined", { userId: socket.id });
  });

  socket.on("offer", ({ streamId, offer }) => {
    console.log(`Offer received for stream ${streamId} from ${socket.id}`);
    socket.to(streamId).emit("offer", { userId: socket.id, offer });
  });

  socket.on("answer", ({ streamId, answer }) => {
    console.log(`Answer received for stream ${streamId} from ${socket.id}`);
    socket.to(streamId).emit("answer", { userId: socket.id, answer });
  });

  socket.on("ice-candidate", ({ streamId, candidate }) => {
    console.log(`ICE Candidate received for stream ${streamId}`);
    socket.to(streamId).emit("ice-candidate", { userId: socket.id, candidate });
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    // Notify all rooms the user was part of
    io.emit("user-disconnected", { userId: socket.id });
  });
});

// API Routes
app.get("/", (req, res) => res.send("<h1>Starface Backend is working</h1>"));
app.use("/api/auths", auths);
app.use("/api/auth", googleAuth);
app.use("/api/reel", reels);
app.use("/api/post", fileUpload);

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
app.use("/api/stream", streamRoutes(io));
app.use("/api/post-action", reelsAction(io));
app.use("/api/trans", withdrawalRoutes);
app.use("/api/staking", stakingRoutes);
app.use("/api/promotion", promotion);

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
