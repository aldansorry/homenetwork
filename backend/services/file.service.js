const path = require("path");
const fs = require("fs");
const { readDir, readFile } = require("../utils/filesystem.util");
require("dotenv").config();

const rootPath = "/app/data"; // root folder file server

// Resolve dynamic path safely
exports.resolvePath = (dynamicPath = "") => {
  const safePath = path.normalize(dynamicPath).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(rootPath, safePath);
};

// Get folder or file info
exports.getInfo = (targetPath) => {
  if (!fs.existsSync(targetPath)) return null;

  const stat = fs.statSync(targetPath);

  // ===========================
  // DIRECTORY
  // ===========================
  if (stat.isDirectory()) {
    const dirItems = fs.readdirSync(targetPath).map((name) => {
      const fullPath = path.join(targetPath, name);
      const itemStat = fs.statSync(fullPath);

      // path relatif dari rootPath, misal: "test/Denah_UPAP_20250625.pdf"
      const relativePath = path
        .relative(rootPath, fullPath)
        .split(path.sep)
        .join("/");

      const apiPath = `/api/file/find/${relativePath}`;

      if (itemStat.isDirectory()) {
        return {
          name,
          type: "directory",
          apiPath,
        };
      }

      return {
        name,
        type: "file",
        extension: path.extname(name).slice(1).toLowerCase(),
        size: itemStat.size,
        apiPath,
      };
    });

    const sortedItems = dirItems.sort((a, b) => {
      // Folder dulu
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;

      // Jika sama-sama folder atau sama-sama file → urut A-Z
      return a.name.localeCompare(b.name);
    });

    return {
      type: "directory",
      items: sortedItems, // semua digabung di sini
    };
  }

  // ===========================
  // FILE
  // ===========================
  if (stat.isFile()) {
    return {
      type: "file",
      filename: path.basename(targetPath),
      extension: path.extname(targetPath).replace(".", "").toLowerCase(),
      size: stat.size,
      absolutePath: targetPath,
    };
  }

  return null;
};

// Move file to a different directory under rootPath
exports.moveFile = (filePath, dirPath) => {
  const sourcePath = exports.resolvePath(filePath);
  const destinationDir = exports.resolvePath(dirPath);

  if (!fs.existsSync(sourcePath)) {
    return { ok: false, status: 404, message: "Source file not found" };
  }

  const sourceStat = fs.statSync(sourcePath);
  if (!sourceStat.isFile()) {
    return { ok: false, status: 400, message: "Source path is not a file" };
  }

  if (!fs.existsSync(destinationDir)) {
    return { ok: false, status: 404, message: "Destination directory not found" };
  }

  const destinationStat = fs.statSync(destinationDir);
  if (!destinationStat.isDirectory()) {
    return { ok: false, status: 400, message: "Destination path is not a directory" };
  }

  const destinationPath = path.join(destinationDir, path.basename(sourcePath));

  if (fs.existsSync(destinationPath)) {
    return { ok: false, status: 409, message: "File already exists in destination" };
  }

  fs.renameSync(sourcePath, destinationPath);

  const relativePath = path.relative(rootPath, destinationPath).split(path.sep).join("/");

  return {
    ok: true,
    path: relativePath,
  };
};

