const fs = require("fs");
const path = require("path");
const musicService = require("../services/music.service");

exports.getAllMusic = (req, res) => {
  const data = musicService.list();
  res.json({
    status: "success",
    total: data.length,
    data,
  });
};

exports.getMusicById = (req, res) => {
  const id = Number(req.params.id);
  const music = musicService.getById(id);

  if (!music) {
    return res.status(404).json({
      status: "error",
      message: "Music not found",
    });
  }

  res.json({
    status: "success",
    data: music,
  });
};

exports.getMusicByCategory = (req, res) => {
  const category = req.params.kategori;
  const data = musicService.listByCategory(category);

  res.json({
    status: "success",
    total: data.length,
    data,
  });
};

exports.getUncategorizedMusic = (req, res) => {
  const data = musicService.listUncategorized();

  res.json({
    status: "success",
    total: data.length,
    data,
  });
};

exports.getCategories = (req, res) => {
  const data = musicService.listCategories();

  res.json({
    status: "success",
    total: data.length,
    data,
  });
};

exports.setMusicCategory = (req, res) => {
  const id = Number(req.params.id);
  const category = req.params.kategori;

  if (!category) {
    return res.status(400).json({
      status: "error",
      message: "Kategori harus diisi",
    });
  }

  const music = musicService.setCategory(id, category);

  if (!music) {
    return res.status(404).json({
      status: "error",
      message: "Music not found",
    });
  }

  res.json({
    status: "success",
    data: music,
  });
};

exports.streamMusic = (req, res) => {
  const id = Number(req.params.id);

  const filePath = musicService.getFilePath(id);
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({
      status: "error",
      message: "Music not found",
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

exports.downloadMusic = (req, res) => {
  const id = Number(req.params.id);
  const filePath = musicService.getFilePath(id);

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({
      status: "error",
      message: "Music not found",
    });
  }

  const filename = path.basename(filePath);

  try {
    const stat = fs.statSync(filePath);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(filename)}"`
    );
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Type", "audio/mpeg");

    const fileStream = fs.createReadStream(filePath);
    fileStream.on("error", (err) => {
      console.error("Error streaming music file:", err);
      if (!res.headersSent) {
        res.status(500).json({
          status: "error",
          message: "Failed to download file",
        });
      } else {
        res.destroy(err);
      }
    });

    fileStream.pipe(res);
  } catch (err) {
    console.error("Error preparing music download:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to download file",
    });
  }
};
