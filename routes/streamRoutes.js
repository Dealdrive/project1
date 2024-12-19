const express = require("express");
const { streamController } = require("../controllers/streamController");

const streamRoutes = (io) => {
  const {
    startStream,
    endStream,
    joinStream,
    sendStreamMessage,
    getActiveStreams,
  } = streamController(io);

  const router = express.Router();

  router.post("/start", startStream);
  router.post("/end", endStream);
  router.post("/join", joinStream);
  router.post("/message", sendStreamMessage);
  router.get("/active", getActiveStreams);

  return router;
};

module.exports = streamRoutes;
