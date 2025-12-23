const fs = require("fs");
const podcastService = require("../services/podcast.service");

exports.getAllPodcast = async (_req, res) => {
  try {
    const data = await podcastService.list();
    res.json({
      status: "success",
      total: data.length,
      data,
    });
  } catch (err) {
    console.error("getAllPodcast error:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

exports.streamPodcast = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ status: "error", message: "Invalid podcast id" });
  }

  try {
    const filePath = await podcastService.getFilePath(id);

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        status: "error",
        message: "Podcast not found",
      });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (!range) {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "audio/mpeg",
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunkSize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "audio/mpeg",
    });

    file.pipe(res);
  } catch (err) {
    console.error("streamPodcast error:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

exports.downloadPodcast = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ status: "error", message: "Invalid podcast id" });
  }

  try {
    const podcast = await podcastService.getById(id);

    if (!podcast) {
      return res.status(404).json({
        status: "error",
        message: "Podcast not found",
      });
    }

    const filePath = await podcastService.getFilePath(id);

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        status: "error",
        message: "Podcast file not found",
      });
    }

    res.download(filePath, `${podcast.title}.mp3`);
  } catch (err) {
    console.error("downloadPodcast error:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};
