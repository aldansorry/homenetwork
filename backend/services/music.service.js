const fs = require("fs");
const path = require("path");
const db = require("../utils/db");
require("dotenv").config();

exports.list = async () => {
  const res = await db.query(
    `SELECT id, type, title, category, description, path FROM music ORDER BY id ASC`
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
    `SELECT id, type, title, category, description, path FROM music WHERE LOWER(category) = LOWER($1) ORDER BY id ASC`,
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
    `SELECT id, type, title, category, description, path FROM music WHERE category IS NULL OR category = '' ORDER BY id ASC`
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
    `SELECT id, type, title, category, description, path FROM music WHERE id = $1 LIMIT 1`,
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
  const res = await db.query(
    `UPDATE music SET category = $1 WHERE id = $2 RETURNING id, type, title, category, description, path`,
    [category, id]
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

exports.getFilePath = async (id) => {
  const res = await db.query(`SELECT path FROM music WHERE id = $1 LIMIT 1`, [id]);
  if (!res.rows[0] || !res.rows[0].path) return null;
  return res.rows[0].path;
};
