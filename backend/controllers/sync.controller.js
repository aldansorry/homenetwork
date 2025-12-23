const { runSyncMedia } = require("../sync-media");

// POST /api/sync/media
exports.syncMedia = async (_req, res) => {
  try {
    await runSyncMedia();
    res.json({
      status: "success",
      message: "Media sync completed",
    });
  } catch (err) {
    console.error("syncMedia error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to sync media",
    });
  }
};
