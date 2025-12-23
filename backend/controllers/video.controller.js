const fs = require("fs");
const path = require("path");
const util = require("util");
const { execFile } = require("child_process");
const videoService = require("../services/video.service");
const videoQueue = require("../queues/video.queue");

const execFileAsync = util.promisify(execFile);

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "y"].includes(String(value).toLowerCase());
};

const supportedArchiveFormats = ["7z", "zip"];
const normalizeFormat = (value = "7z") => {
  const clean = String(value || "7z").replace(/^\./, "").toLowerCase();
  return supportedArchiveFormats.includes(clean) ? clean : "7z";
};

const resolveEpisodePath = async (title, series, episode) => {
  const dbPath = await videoService.getEpisodePathFromDb(title, series, episode);
  const fsPath = videoService.getEpisodePath(title, series, episode);
  return dbPath || fsPath;
};

const buildSubtitlePath = (videoPath) => {
  const parsed = path.parse(videoPath);
  return path.join(parsed.dir, `${parsed.name}.vtt`);
};

const findSidecarSrt = (videoPath) => {
  const parsed = path.parse(videoPath);
  const dir = parsed.dir;
  const baseName = parsed.name.toLowerCase();

  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const parsedFile = path.parse(file);
    if (parsedFile.name.toLowerCase() === baseName && parsedFile.ext.toLowerCase() === ".srt") {
      return path.join(dir, file);
    }
  }

  return null;
};

// GET /api/video
exports.getAllVideos = async (req, res) => {
  try {
    const data = await videoService.listFromDb();
    res.json({
      status: "success",
      total: data.length,
      data,
    });
  } catch (err) {
    console.error("getAllVideos error:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

exports.getVideoSeries = async (req, res) => {
  const title = req.params.title;
  try {
    const data = await videoService.getSeriesFromDb(title);

    if (!data) {
      return res.status(404).json({
        status: "error",
        message: "Series not found",
      });
    }

    res.json({
      status: "success",
      data,
    });
  } catch (err) {
    console.error("getVideoSeries error:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

// GET /api/video/:title
exports.getVideoDetail = async (req, res) => {
  const title = req.params.title;
  const series = req.params.series;
  try {
    const data = await videoService.getDetailFromDb(title, series);

    if (!data) {
      return res.status(404).json({
        status: "error",
        message: "Video not found",
      });
    }

    res.json({
      status: "success",
      data,
    });
  } catch (err) {
    console.error("getVideoDetail error:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

exports.getCover = (req, res) => {
  const title = req.params.title;
  const coverPath = videoService.getCoverPath(title);

  if (!coverPath || !fs.existsSync(coverPath)) {
    return res.status(404).send("Cover not found");
  }

  // Tentukan MIME type sesuai extension
  const ext = path.extname(coverPath).toLowerCase();
  let mime = "image/jpeg"; // default

  if (ext === ".png") mime = "image/png";
  if (ext === ".webp") mime = "image/webp";
  if (ext === ".gif") mime = "image/gif";
  if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";

  // Header CORS (jika perlu digunakan image cross-site)
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.writeHead(200, { "Content-Type": mime });

  const stream = fs.createReadStream(coverPath);
  stream.pipe(res);

  stream.on("error", () => {
    return res.status(500).send("Error streaming cover");
  });
};

// GET /api/video/:title/stream/:episode
exports.streamEpisode = async (req, res) => {
  const { title, series, episode } = req.params;

  try {
    const resolvedPath = await resolveEpisodePath(title, series, episode);

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        status: "error",
        message: "Episode not found",
      });
    }

    const stat = fs.statSync(resolvedPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (!range) {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
      });

      fs.createReadStream(resolvedPath).pipe(res);
      return;
    }

    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunkSize = end - start + 1;
    const file = fs.createReadStream(resolvedPath, { start, end });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "video/mp4",
    });

    file.pipe(res);
  } catch (err) {
    console.error("streamEpisode error:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

// POST /api/video/:title/:series/extract-subtitle/:episode
exports.extractSubtitle = async (req, res) => {
  const { title, series, episode } = req.params;

  try {
    const resolvedPath = await resolveEpisodePath(title, series, episode);

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        status: "error",
        message: "Episode not found",
      });
    }

    const subtitlePath = buildSubtitlePath(resolvedPath);

    const sidecarSrt = findSidecarSrt(resolvedPath);

    if (sidecarSrt) {
      // Convert existing .srt to .vtt
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        sidecarSrt,
        subtitlePath,
      ]);
    } else {
      // Extract first embedded subtitle track to WebVTT
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        resolvedPath,
        "-map",
        "0:s:0",
        "-c:s",
        "webvtt",
        subtitlePath,
      ]);
    }

    if (!fs.existsSync(subtitlePath)) {
      return res.status(500).json({
        status: "error",
        message: "Subtitle extraction failed",
      });
    }

    return res.json({
      status: "success",
      subtitle: path.basename(subtitlePath),
      path: subtitlePath,
      message: "Subtitle extracted as .vtt",
    });
  } catch (err) {
    console.error("extractSubtitle error:", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to extract subtitle",
    });
  }
};

// GET /api/video/:title/:series/subtitle/:episode
exports.streamSubtitle = async (req, res) => {
  const { title, series, episode } = req.params;

  try {
    const resolvedPath = await resolveEpisodePath(title, series, episode);

    if (!resolvedPath || !fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        status: "error",
        message: "Episode not found",
      });
    }

    const subtitlePath = buildSubtitlePath(resolvedPath);

    if (!fs.existsSync(subtitlePath)) {
      return res.status(404).json({
        status: "error",
        message: "Subtitle not found",
      });
    }

    res.setHeader("Content-Type", "text/vtt");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const stream = fs.createReadStream(subtitlePath);
    stream.pipe(res);

    stream.on("error", () => {
      return res.status(500).send("Error streaming subtitle");
    });
  } catch (err) {
    console.error("streamSubtitle error:", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to stream subtitle",
    });
  }
};

// POST /api/video/:title/:series/archive
exports.archiveSeries = (req, res) => {
  const { title, series } = req.params;
  const format = normalizeFormat(req.body?.format || req.query?.format || "7z");
  const overwrite = parseBoolean(req.body?.overwrite ?? req.query?.overwrite, false);

  const sourceDir = videoService.getSeriesPath(title, series);
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    return res.status(404).json({
      status: "error",
      message: "Series folder not found",
    });
  }

  const jobId = Date.now().toString();
  videoQueue.push({
    jobId,
    action: "archive",
    title,
    series,
    format,
    overwrite,
  });

  return res.json({
    status: "processing",
    action: "archive",
    jobId,
    title,
    series,
    target: `${series}.${format.replace(/^\./, "")}`,
    message: "Series added to archive queue",
  });
};

// POST /api/video/:title/:series/extract
exports.extractArchive = (req, res) => {
  const { title, series } = req.params;
  const destination = req.body?.destination || req.query?.destination;
  const archiveName = req.body?.archive || req.query?.archive || series;
  const overwrite = parseBoolean(req.body?.overwrite ?? req.query?.overwrite, false);

  const archivePath = videoService.findArchiveFile(title, archiveName);
  if (!archivePath) {
    return res.status(404).json({
      status: "error",
      message: "Archive file not found",
    });
  }

  const jobId = Date.now().toString();
  videoQueue.push({
    jobId,
    action: "extract",
    title,
    series: archiveName,
    archiveName,
    destination,
    overwrite,
  });

  return res.json({
    status: "processing",
    action: "extract",
    jobId,
    title,
    archive: path.basename(archivePath),
    destination: (
      destination ||
      path.join(title, videoService.getArchiveBaseName(path.basename(archivePath)))
    )
      .split(path.sep)
      .join("/"),
    message: "Archive added to extract queue",
  });
};
