const fs = require("fs");
const fileService = require("../services/file.service");

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
