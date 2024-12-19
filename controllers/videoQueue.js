const Queue = require("bull");
const videoQueue = new Queue("video processing", {
  redis: { port: 6379, host: "127.0.0.1" },
});

module.exports = videoQueue;