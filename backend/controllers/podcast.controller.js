const fs = require("fs");
const podcastService = require("../services/podcast.service");

exports.getAllPodcast = (req, res) => {
  const data = podcastService.list();
  res.json({
    status: "success",
    total: data.length,
    data,
  });
};

exports.streamPodcast = (req, res) => {
  const id = Number(req.params.id);
  const filePath = podcastService.getFilePath(id);

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
};

exports.downloadPodcast = (req, res) => {
  const id = Number(req.params.id);
  const podcast = podcastService.getById(id);

  if (!podcast) {
    return res.status(404).json({
      status: "error",
      message: "Podcast not found",
    });
  }

  const filePath = podcastService.getFilePath(id);

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({
      status: "error",
      message: "Podcast file not found",
    });
  }

  res.download(filePath, podcast.filename);
};
