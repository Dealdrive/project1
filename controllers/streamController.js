const streamController = (io) => {
  let viewerCounts = {}; // Optional in-memory storage for viewer counts

  const updateViewerCount = (streamId, increment = true) => {
    if (!viewerCounts[streamId]) viewerCounts[streamId] = 0;

    if (increment) viewerCounts[streamId]++;
    else viewerCounts[streamId]--;

    io.to(streamId).emit("viewer-count-updated", {
      streamId,
      viewerCount: viewerCounts[streamId],
    });
  };

  const startStream = (req, res) => {
    const { streamId, hostId } = req.body;

    io.emit("stream-started", { streamId, hostId });

    res.status(200).json({ message: "Stream started successfully." });
  };

  const endStream = (req, res) => {
    const { streamId } = req.body;

    io.to(streamId).emit("stream-ended", { streamId });

    res.status(200).json({ message: "Stream ended successfully." });
  };

  const joinStream = (req, res) => {
    const { streamId, userId } = req.body;

    io.to(streamId).emit("user-joined", { userId });

    updateViewerCount(streamId, true);

    res.status(200).json({ message: "User joined the stream successfully." });
  };

  const sendStreamMessage = (req, res) => {
    const { streamId, userId, message } = req.body;

    io.to(streamId).emit("stream-message", { userId, message });

    res.status(200).json({ message: "Message sent to the stream." });
  };

  const getActiveStreams = (req, res) => {
    const activeStreams = [
      { streamId: "123", hostId: "user1" },
      { streamId: "456", hostId: "user2" },
    ];

    res.status(200).json({ activeStreams });
  };

  return {
    startStream,
    endStream,
    joinStream,
    sendStreamMessage,
    getActiveStreams,
  };
};

module.exports = { streamController };
