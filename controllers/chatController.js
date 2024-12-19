const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");
const Message = require("../models/Message");
const User = require("../models/User");
const {
  ChatBalance,
  FlowerBalance,
  EarnBalance,
  StarBalance,
} = require("../models/OtherBalances");
const sendEmailNotification = require("../utils/sendNotification");

const adminId = process.env.SENDER_ID;

// const startConversation = async (req, res) => {
//   const { userId, recipientId } = req.body;

//   let conversation = await Conversation.findOne({
//     participants: { $all: [userId, recipientId] },
//   });

//   if (!conversation) {
//     conversation = new Conversation({ participants: [userId, recipientId] });
//     await conversation.save();
//   }

//   res.status(200).json(conversation);
// };

// const sendMessage = async (req, res) => {
//   const { conversationId, sender, receiver, text } = req.body;

//   const message = new Message({
//     conversationId,
//     sender,
//     receiver,
//     text,
//   });

//   await message.save();

//   await Conversation.findByIdAndUpdate(conversationId, {
//     lastMessage: message._id,
//     updatedAt: Date.now(),
//   });

//   res.status(200).json(message);
// };

// const getMessages = async (req, res) => {
//   const { conversationId } = req.params;

//   const messages = await Message.find({ conversationId }).sort("createdAt");

//   res.status(200).json(messages);
// };

// const getConversations = async (req, res) => {
//   const { userId } = req.params;

//   const conversations = await Conversation.find({ participants: userId })
//     .populate("participants", "username")
//     .populate("lastMessage");

//   res.status(200).json(conversations);
// };

// module.exports = {
//   startConversation,
//   sendMessage,
//   getMessages,
//   getConversations,
// };

const chatController = (io) => {
  const startConversation = async (req, res) => {
    const { userId, recipientId } = req.body;

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId] },
    });

    const user = await User.findById(recipientId);

    const userEmail = user.email;

    if (!conversation) {
      // Create a new conversation request
      conversation = new Conversation({
        participants: [userId, recipientId],
        status: "pending",
      });
      await conversation.save();

      const user = await User.findById(userId);
      const senderName = user.userName;
      // Add notification for the recipient
      const notification = new Notification({
        userId: recipientId,
        type: "request",
        conversationId: conversation._id,
        senderName,
        sender: userId,
      });
      await notification.save();

      // Emit real-time notification
      io.to(recipientId.toString()).emit("newNotification", notification);
    }
    // Notify the admin via email
    const recipientEmail = userEmail;
    const emailSubject = "New chat request";
    const emailMessage = `
      <p>You have a chat request from ...</p>
    `;
    await sendEmailNotification(recipientEmail, emailSubject, emailMessage);

    res.status(200).json(conversation);
  };

  const updateConversationStatus = async (req, res) => {
    const { conversationId } = req.params;
    const { userId } = req.userData;
    const { status } = req.body;

    try {
      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      if (!status === "accepted" || !status === "rejected") {
        return res.json({ message: "Invalid conversation status" });
      }

      const requester = conversation.participants.find(
        (id) => id.toString() !== userId
      );

      if (status === "rejected") {
        await Conversation.findByIdAndDelete(conversationId);

        // Notify the requester
        const notification = new Notification({
          userId: requester,
          type: "request",
          conversationId,
          sender: userId,
          text: "Your conversation request was rejected.",
        });
        await notification.save();
        io.to(requester.toString()).emit("newNotification", notification);

        return res
          .status(200)
          .json({ message: "Conversation rejected and deleted" });
      }

      conversation.status = status;
      await conversation.save();

      // Notify the requester
      const notification = new Notification({
        userId: requester,
        type: "request",
        conversationId,
        sender: userId,
        text: "Your conversation request was accepted.",
      });
      await notification.save();
      io.to(requester.toString()).emit("newNotification", notification);

      res
        .status(200)
        .json({ message: `Conversation status updated to ${status}` });
    } catch (error) {
      console.error("Error updating conversation status:", error);
      res.status(500).json({ message: "An error occurred" });
    }
  };

  const sendMessage = async (req, res) => {
    const { conversationId, sender, receiver, text } = req.body;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    const conversationStarter = conversation.userId;
    if (conversationStarter === sender) {
      if (conversation.status !== "accepted") {
        return res.json({
          message:
            "Your conversation with this person has not been accepted yet",
        });
      }
      conversation.status = "accepted";
      await conversation();
    }

    // Balance check logic
    const amountPerChat = 8;

    const senderWallet = await ChatBalance.findOne({ userId: sender });

    if (!senderWallet || senderWallet.balance < amountPerChat) {
      return res.status(400).json({
        message:
          "Insufficient balance to send message. Fund your chat balance to continue messaging",
      });
    }
    const adminWallet = await ChatBalance.findOne({ userId: adminId });

    adminWallet.balance += amountPerChat;

    senderWallet.balance -= amountPerChat;
    await senderWallet.save();
    await adminWallet.save();

    const message = new Message({
      conversationId,
      sender,
      receiver,
      text,
    });

    await message.save();

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: Date.now(),
    });

    const user = await User.findById(sender);
    const senderName = user.userName;
    // Add notification for the receiver
    const notification = new Notification({
      userId: receiver,
      type: "message",
      conversationId,
      sender,
      senderName,
      text,
    });
    await notification.save();

    // Emit real-time notification
    io.to(receiver.toString()).emit("newNotification", notification);

    // Emit the message to the conversation room
    io.to(conversationId).emit("receiveMessage", message);

    res.status(200).json(message);
  };

  const getNotifications = async (req, res) => {
    const { userId } = req.userData;

    try {
      const notifications = await Notification.find({ userId }).sort({
        createdAt: -1,
      });
      io.to(userId).emit("allNotifications", { notifications });
      res.status(200).json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  };

  const getSingleNotifications = async (req, res) => {
    const { notificationId } = req.params;

    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      notification.isRead = true;
      await notification.save();

      io.to(notification.userId).emit("singleNotifications", { notification });

      res.status(200).json(notification);
    } catch (error) {
      console.error("Error fetching notification:", error);
      res.status(500).json({ message: "Failed to fetch notification" });
    }
  };

  const getMessages = async (req, res) => {
    const { conversationId } = req.params;

    const messages = await Message.find({ conversationId }).sort("createdAt");

    io.to(conversationId).emit("allMessages", { conversationId, messages });

    res.status(200).json(messages);
  };

  const markMessageAsRead = async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { userId } = req.body;

      await Message.updateMany(
        { conversationId, readBy: { $ne: userId } },
        { $push: { readBy: userId } }
      );

      res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "An error occurred while marking messages as read" });
    }
  };

  const getConversations = async (req, res) => {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId, "userName profilePicture");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const conversations = await Conversation.find({ participants: userId })
        .populate({
          path: "participants",
          select: "userName profilePicture",
        })
        .populate({
          path: "lastMessage",
          populate: [
            { path: "sender", select: "userName profilePicture" },
            { path: "receiver", select: "userName profilePicture" },
          ],
          select: "_id conversationId sender receiver text createdAt readBy",
        });

      const formattedConversations = conversations.map((conversation) => {
        const isUnread =
          conversation.lastMessage && conversation.lastMessage.readBy
            ? !conversation.lastMessage.readBy.includes(userId)
            : false;

        // Determine sender and receiver based on participants and userId
        const sender = conversation.participants.find(
          (participant) => participant._id.toString() === userId
        );
        const receiver = conversation.participants.find(
          (participant) => participant._id.toString() !== userId
        );

        return {
          _id: conversation._id,
          participants: conversation.participants.map((participant) => ({
            _id: participant._id,
            userName: participant.userName,
            profilePicture: participant.profilePicture,
          })),
          status: conversation.status,
          sender: sender
            ? {
                senderId: sender._id,
                userName: sender.userName,
                profilePicture: sender.profilePicture,
              }
            : null,
          receiver: receiver
            ? {
                receiverId: receiver._id,
                userName: receiver.userName,
                profilePicture: receiver.profilePicture,
              }
            : null,
          lastMessage: conversation.lastMessage
            ? {
                _id: conversation.lastMessage._id,
                conversationId: conversation.lastMessage.conversationId,
                text: conversation.lastMessage.text,
                createdAt: conversation.lastMessage.createdAt,
              }
            : null,
          readStatus: isUnread ? "unread" : "read",
          updatedAt: conversation.updatedAt,
        };
      });
      io.to(userId).emit("allConversation", { userId, formattedConversations });
      res.status(200).json(formattedConversations);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "An error occurred while retrieving conversations",
      });
    }
  };

  const getConversationById = async (req, res) => {
    try {
      const { conversationId } = req.params;

      const conversation = await Conversation.findById(conversationId)
        .populate({
          path: "participants",
          select: "userName profilePicture",
        })
        .populate({
          path: "lastMessage",
          populate: [
            { path: "sender", select: "userName profilePicture" },
            { path: "receiver", select: "userName profilePicture" },
          ],
          select: "_id conversationId sender receiver text createdAt readBy",
        });

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Assuming the sender and receiver are determined based on the participants
      const [participant1, participant2] = conversation.participants;

      const formattedConversation = {
        _id: conversation._id,
        participants: conversation.participants.map((participant) => ({
          _id: participant._id,
          userName: participant.userName,
          profilePicture: participant.profilePicture,
        })),
        status: conversation.status,
        sender: participant1
          ? {
              senderId: participant1._id,
              userName: participant1.userName,
              profilePicture: participant1.profilePicture,
            }
          : null,
        receiver: participant2
          ? {
              receiverId: participant2._id,
              userName: participant2.userName,
              profilePicture: participant2.profilePicture,
            }
          : null,
        lastMessage: conversation.lastMessage
          ? {
              _id: conversation.lastMessage._id,
              conversationId: conversation.lastMessage.conversationId,
              text: conversation.lastMessage.text,
              createdAt: conversation.lastMessage.createdAt,
            }
          : null,
        readStatus:
          conversation.lastMessage && conversation.lastMessage.readBy
            ? !conversation.lastMessage.readBy.includes(participant1._id)
              ? "unread"
              : "read"
            : "read",
        updatedAt: conversation.updatedAt,
      };

      res.status(200).json(formattedConversation);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "An error occurred while retrieving the conversation",
      });
    }
  };

  const deleteConversation = async (req, res) => {
    try {
      const { conversationId } = req.params;

      const conversation = await Conversation.findByIdAndDelete(conversationId);

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      res.status(200).json({ message: "Conversation deleted successfully" });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "An error occurred while deleting the conversation" });
    }
  };

  return {
    sendMessage,
    markMessageAsRead,
    startConversation,
    getNotifications,
    getSingleNotifications,
    updateConversationStatus,
    getMessages,
    getConversations,
    getConversationById,
    deleteConversation,
  };
};

module.exports = { chatController };
