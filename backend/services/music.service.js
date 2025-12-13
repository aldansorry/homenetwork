const fs = require("fs");
const path = require("path");
const { readFile } = require("../utils/filesystem.util");
require("dotenv").config();
const NodeID3 = require("node-id3");

const musicDir = "/app/data/music";
const categoryFilePath = "/app/data/json/music.json";

const readCategoryData = () => {
  try {
    const raw = fs.readFileSync(categoryFilePath, "utf-8");
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    return {};
  }
};

const writeCategoryData = (data) => {
  const dir = path.dirname(categoryFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(categoryFilePath, JSON.stringify(data, null, 2));
};

const mapFile = (filename, index, categories) => {
  return {
    id: index + 1,
    title: path.parse(filename).name,
    filename,
    categories: categories[filename] ?? [],
    file_src: `/api/music/${index + 1}/stream`,
  };
};

exports.list = () => {
  const files = readFile(musicDir);
  const categories = readCategoryData();
  return files.map((filename, i) => mapFile(filename, i, categories));
};

exports.listByCategory = (category) => {
  const files = readFile(musicDir);
  const categories = readCategoryData();
  const normalizedCategory = category.toLowerCase();

  return files
    .map((filename, i) => mapFile(filename, i, categories))
    .filter((item) =>
      (item.categories || []).some(
        (cat) => cat.toLowerCase() === normalizedCategory
      )
    );
};

exports.listUncategorized = () => {
  const files = readFile(musicDir);
  const categories = readCategoryData();

  return files
    .map((filename, i) => mapFile(filename, i, categories))
    .filter((item) => !item.categories || item.categories.length === 0);
};

exports.getById = (id) => {
  const files = readFile(musicDir);
  const filename = files[id - 1];
  if (!filename) return null;

  const categories = readCategoryData();
  return mapFile(filename, id - 1, categories);
};

exports.listCategories = () => {
  const files = readFile(musicDir);
  const categories = readCategoryData();
  const counts = {};

  files.forEach((filename) => {
    const fileCategories = categories[filename] || [];
    fileCategories.forEach((cat) => {
      const key = cat.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
  });

  return Object.keys(counts).map((cat) => ({
    category: cat,
    total: counts[cat],
  }));
};

exports.setCategory = (id, category) => {
  const files = readFile(musicDir);
  const filename = files[id - 1];
  if (!filename) return null;

  const normalizedCategory = category.toLowerCase();
  const data = readCategoryData();
  const currentCategories = data[filename] || [];

  if (!currentCategories.includes(normalizedCategory)) {
    data[filename] =  [normalizedCategory];
    writeCategoryData(data);
  }

  return mapFile(filename, id - 1, data);
};

exports.getFilePath = (id) => {
  const files = readFile(musicDir);
  const filename = files[id - 1];
  if (!filename) return null;
  return path.join(musicDir, filename);
};
