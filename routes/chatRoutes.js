const express = require("express");
const { chatController } = require("../controllers/chatController");
const { verifyUser } = require("../middlewares/authentication");

const chatRoutes = (io) => {
  const {
    startConversation,
    updateConversationStatus,
    sendMessage,
    getMessages,
    getNotifications,
    getSingleNotifications,
    getConversations,
    getConversationById,
    deleteConversation,
    markMessageAsRead,
  } = chatController(io);

  const router = express.Router();

  // Route to start a new conversation or retrieve an existing one
  router.post("/startConversation", startConversation);

  router.post(
    "/startConversation/status/:conversationId",
    verifyUser,
    updateConversationStatus
  );

  // Route to send a message in a conversation
  router.post("/sendMessage", sendMessage);

  // Route to get all messages in a specific conversation
  router.get("/messages/:conversationId", getMessages);

  router.post("/conversations/:conversationId/read", markMessageAsRead);

  // Route to delete a specific conversation
  router.delete("/conversations/delete/:conversationId", deleteConversation);

  // Route to get all conversations for a specific user
  router.get("/conversations/:userId", getConversations);

  // Route to get all notification for a specific user
  router.get("/notification", verifyUser, getNotifications);
  router.get(
    "/notification/:notificationId",
    verifyUser,
    getSingleNotifications
  );

  // Route to get all conversations by the conversation Id
  router.get("/single-conversations/:conversationId", getConversationById);

  return router;
};

module.exports = chatRoutes;
