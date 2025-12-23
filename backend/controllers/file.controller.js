const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const fileService = require("../services/file.service");

const mimeMap = {
  mp4: "video/mp4",
  mkv: "video/x-matroska",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  flac: "audio/flac",
  aac: "audio/aac",
  m4a: "audio/mp4",
  weba: "audio/webm",
  zip: "application/zip",
  "7z": "application/x-7z-compressed",
  rar: "application/vnd.rar",
  gz: "application/gzip",
  tar: "application/x-tar",
};

const archiveExtensions = ["7z", "zip", "rar", "tar", "gz", "tgz", "tar.gz", "tar.bz2", "tbz2", "tar.xz", "txz", "wim"];

const run7z = (args, cwd) =>
  new Promise((resolve, reject) => {
    const proc = spawn("7z", args, { cwd });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      reject(new Error(stderr || stdout || `7z exited with code ${code}`));
    });
  });

// FIND
exports.find = (req, res) => {
  let segments = req.params.segments;

  // Jika root folder (tidak ada segments)
  if (!segments) {
    segments = "";
  }

  // Jika segments adalah array → gabungkan jadi path
  if (Array.isArray(segments)) {
    segments = segments.join("/");
  }
  const targetPath = fileService.resolvePath(segments);

  const info = fileService.getInfo(targetPath);

  if (!info) {
    return res.status(404).json({ status: "error", message: "Path not found" });
  }

  if (info.type === "directory") {
    return res.json({
      status: "success",
      current: segments,
      data: info,
    });
  }

  return res.download(info.absolutePath, info.filename);
};

// STREAM (media)
exports.stream = (req, res) => {
  let segments = req.params.segments;

  if (!segments) segments = "";
  if (Array.isArray(segments)) segments = segments.join("/");

  const targetPath = fileService.resolvePath(segments);
  const info = fileService.getInfo(targetPath);

  if (!info || info.type !== "file") {
    return res.status(404).json({ status: "error", message: "File not found" });
  }

  const ext = info.extension;
  const mime = mimeMap[ext] || "application/octet-stream";

  const stat = fs.statSync(targetPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": mime,
    });
    fs.createReadStream(targetPath).pipe(res);
    return;
  }

  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

  if (start >= fileSize || end >= fileSize) {
    res.writeHead(416, {
      "Content-Range": `bytes */${fileSize}`,
    });
    return res.end();
  }

  const chunkSize = end - start + 1;
  const file = fs.createReadStream(targetPath, { start, end });

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunkSize,
    "Content-Type": mime,
  });

  file.pipe(res);
};

// ARCHIVE (folder -> .7z)
exports.archive = async (req, res) => {
  const relativePath = req.body?.path;
  const overwrite = Boolean(req.body?.overwrite);

  if (!relativePath) {
    return res.status(400).json({ status: "error", message: "path is required" });
  }

  try {
    const targetPath = fileService.resolvePath(relativePath);
    if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
      return res.status(404).json({ status: "error", message: "Folder not found" });
    }

    const parentDir = path.dirname(targetPath);
    const folderName = path.basename(targetPath);
    const archivePath = path.join(parentDir, `${folderName}.7z`);

    if (fs.existsSync(archivePath) && !overwrite) {
      return res.status(409).json({ status: "error", message: "Archive already exists" });
    }

    if (fs.existsSync(archivePath) && overwrite) {
      fs.unlinkSync(archivePath);
    }

    await run7z(["a", "-t7z", path.basename(archivePath), folderName, "-mx=5"], parentDir);

    return res.json({
      status: "success",
      message: "Archive created",
      archive: archivePath,
    });
  } catch (err) {
    console.error("archive folder error:", err);
    return res.status(500).json({ status: "error", message: "Failed to archive folder" });
  }
};

// EXTRACT (archive -> folder)
exports.extract = async (req, res) => {
  const relativePath = req.body?.path;
  const destination = req.body?.destination; // optional relative
  const overwrite = Boolean(req.body?.overwrite);

  if (!relativePath) {
    return res.status(400).json({ status: "error", message: "path is required" });
  }

  try {
    const archivePath = fileService.resolvePath(relativePath);
    if (!fs.existsSync(archivePath) || !fs.statSync(archivePath).isFile()) {
      return res.status(404).json({ status: "error", message: "Archive not found" });
    }

    const ext = path.extname(archivePath).replace(".", "").toLowerCase();
    const base = path.basename(archivePath, path.extname(archivePath));
    if (!archiveExtensions.includes(ext)) {
      return res.status(400).json({ status: "error", message: "Unsupported archive type" });
    }

    const rootPath = fileService.resolvePath("");
    const archiveDir = path.dirname(archivePath);
    const destinationPath = destination
      ? fileService.resolvePath(destination)
      : archiveDir; // extract here by default

    if (!destinationPath.startsWith(rootPath)) {
      return res.status(400).json({ status: "error", message: "Destination must be inside root" });
    }

    if (fs.existsSync(destinationPath)) {
      const hasContent = fs.readdirSync(destinationPath).length > 0;
      const isDefault = destinationPath === archiveDir;
      // Allow extracting into existing archiveDir even if it has content, to avoid double folder issue
      if (hasContent && !overwrite && !isDefault) {
        return res
          .status(409)
          .json({ status: "error", message: "Destination not empty. Set overwrite=true to replace." });
      }
      if (hasContent && overwrite && !isDefault) {
        fs.rmSync(destinationPath, { recursive: true, force: true });
      }
    }

    if (!fs.existsSync(destinationPath)) {
      fs.mkdirSync(destinationPath, { recursive: true });
    }

    await run7z(["x", path.basename(archivePath), `-o${destinationPath}`, "-y"], archiveDir);

    return res.json({
      status: "success",
      message: "Archive extracted",
      output: destinationPath,
    });
  } catch (err) {
    console.error("extract archive error:", err);
    return res.status(500).json({ status: "error", message: "Failed to extract archive" });
  }
};

// UPLOAD
exports.upload = (req, res) => {
  let segments = req.params.segments || "";

  if (Array.isArray(segments)) {
    segments = segments.join("/");
  }

  const targetDir = fileService.resolvePath(segments);

  // Simpan target dir ke request agar digunakan oleh Multer storage
  req.uploadTarget = targetDir;

  // Jalankan multer middleware yang sudah dibuat di router (req.file sudah terisi di sini)
  if (!req.file) {
    return res.status(400).json({ status: "error", message: "No file uploaded" });
  }

  // Buat folder jika belum ada
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Path penyimpanan sesuai nama file asli
  const savePath = `${targetDir}/${req.file.originalname}`;

  // Jika file awalnya disimpan di folder lain, pindahkan
  if (req.file.path !== savePath) {
    fs.renameSync(req.file.path, savePath);
  }

  res.json({
    status: "success",
    message: "File uploaded",
    path: (segments ? segments + "/" : "") + req.file.originalname,
  });
};

// MOVE
exports.move = (req, res) => {
  const { file_path: filePath, dir_path: dirPath } = req.body || {};
  if (!filePath) {
    return res
      .status(400)
      .json({ status: "error", message: "file_path and dir_path are required" });
  }

  try {
    const result = fileService.moveFile(filePath, dirPath);

    if (!result.ok) {
      return res
        .status(result.status || 400)
        .json({ status: "error", message: result.message });
    }

    return res.json({
      status: "success",
      message: "File moved",
      path: result.path,
    });
  } catch (err) {
    console.error("Move file error:", err);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
};
