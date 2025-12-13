const path = require("path");
const NodeID3 = require("node-id3");
const { readFile } = require("../utils/filesystem.util");
require("dotenv").config();

const podcastDir = "/app/data/podcast";

const mapFile = (filename, index) => {
  const tags = NodeID3.read(path.join(podcastDir, filename));
  return {
    id: index + 1,
    title: tags.title ?? path.parse(filename).name,
    filename,
    file_src: `/api/podcast/${index + 1}/stream`,
    download_src: `/api/podcast/${index + 1}/file`,
  };
};

exports.list = () => {
  const files = readFile(podcastDir);
  return files.map((filename, i) => mapFile(filename, i));
};

exports.getById = (id) => {
  const files = readFile(podcastDir);
  const filename = files[id - 1];
  if (!filename) return null;

  return mapFile(filename, id - 1);
};

exports.getFilePath = (id) => {
  const files = readFile(podcastDir);
  const filename = files[id - 1];
  if (!filename) return null;

  return path.join(podcastDir, filename);
};
