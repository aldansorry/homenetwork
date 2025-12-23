const fs = require("fs");
const path = require("path");
const db = require("../utils/db");
require("dotenv").config();

const musicRoot = "/app/data/music";

exports.list = async () => {
  const res = await db.query(
    `SELECT id, type, title, category, description, path FROM music WHERE type = 'music' ORDER BY title ASC`
  );
  return res.rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    category: row.category,
    description: row.description,
    file_src: `/api/music/${row.id}/stream`,
  }));
};

exports.listByCategory = async (category) => {
  const res = await db.query(
    `SELECT id, type, title, category, description, path FROM music WHERE type = 'music' AND LOWER(category) = LOWER($1) ORDER BY title ASC`,
    [category]
  );
  return res.rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    category: row.category,
    description: row.description,
    file_src: `/api/music/${row.id}/stream`,
  }));
};

exports.listUncategorized = async () => {
  const res = await db.query(
    `SELECT id, type, title, category, description, path FROM music WHERE type = 'music' AND (category IS NULL OR category = '') ORDER BY title ASC`
  );
  return res.rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    category: row.category,
    description: row.description,
    file_src: `/api/music/${row.id}/stream`,
  }));
};

exports.getById = async (id) => {
  const res = await db.query(
    `SELECT id, type, title, category, description, path FROM music WHERE id = $1 AND type = 'music' LIMIT 1`,
    [id]
  );
  if (!res.rows[0]) return null;
  const row = res.rows[0];
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    category: row.category,
    description: row.description,
    file_src: `/api/music/${row.id}/stream`,
  };
};

exports.listCategories = async () => {
  const res = await db.query(
    `SELECT LOWER(category) AS category, COUNT(*) AS total FROM music WHERE category IS NOT NULL AND category <> '' GROUP BY LOWER(category) ORDER BY LOWER(category)`
  );
  return res.rows.map((row) => ({
    category: row.category,
    total: Number(row.total),
  }));
};

exports.setCategory = async (id, category) => {
  const current = await db.query(
    `SELECT id, type, title, category, description, path FROM music WHERE id = $1 LIMIT 1`,
    [id]
  );

  if (!current.rows[0]) return null;
  const row = current.rows[0];

  try {
    const targetDir = path.join(musicRoot, category);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filename = row.path ? path.basename(row.path) : `${row.title}.mp3`;
    const targetPath = path.join(targetDir, filename);

    if (row.path && fs.existsSync(row.path)) {
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { force: true });
      }
      fs.renameSync(row.path, targetPath);
    }

    const res = await db.query(
      `UPDATE music SET category = $1, path = $2 WHERE id = $3 RETURNING id, type, title, category, description, path`,
      [category, targetPath, id]
    );

    if (!res.rows[0]) return null;
    const updated = res.rows[0];
    return {
      id: updated.id,
      type: updated.type,
      title: updated.title,
      category: updated.category,
      description: updated.description,
      file_src: `/api/music/${updated.id}/stream`,
    };
  } catch (err) {
    console.error("setCategory move error:", err);
    return null;
  }
};

exports.getFilePath = async (id) => {
  const res = await db.query(`SELECT path FROM music WHERE id = $1 LIMIT 1`, [id]);
  if (!res.rows[0] || !res.rows[0].path) return null;
  return res.rows[0].path;
};
