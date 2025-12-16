const fs = require("fs");
const pathModule = require("path");

/**
 * Read only folders inside a directory
 * @param {string} dirPath
 * @returns {Array<string>}
 */
function readDir(dirPath) {
  if (!dirPath || !fs.existsSync(dirPath)) return [];

  const list = fs.readdirSync(dirPath);

  return list
    .filter((name) => {
      const fullPath = pathModule.join(dirPath, name);
      return fs.statSync(fullPath).isDirectory();
    })
    .map((name) => name);
}

/**
 * Read files in a directory (only files)
 * @param {string} dirPath
 * @param {string|false} extension  Example: "mp3", "pdf" — default false means all files
 * @returns {Array<string>}
 */
function readFile(dirPath, extension = false) {
  if (!dirPath || !fs.existsSync(dirPath)) return [];
  const list = fs.readdirSync(dirPath);
  return list
    .filter((name) => {
      const fullPath = pathModule.join(dirPath, name);
      return fs.statSync(fullPath).isFile();
    })
    .map((name) => name);
}

module.exports = { readDir, readFile };
