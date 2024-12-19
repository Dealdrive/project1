const videoQueue = require("./videoQueue");

const getJobStatus = async (req, res) => {
  const { jobId } = req.params;

  try {
    const job = await videoQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const jobState = await job.getState(); // Can be 'completed', 'failed', 'delayed', etc.
    const jobProgress = job.progress();
    const jobResult = job.returnvalue;

    res.status(200).json({
      status: jobState,
      progress: jobProgress,
      result: jobState === "completed" ? jobResult : null,
    });
  } catch (error) {
    console.error("Error fetching job status:", error);
    res.status(500).json({ message: "Error fetching job status" });
  }
};
module.exports = getJobStatus;
