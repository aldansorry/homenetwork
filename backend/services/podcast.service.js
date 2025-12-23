const db = require("../utils/db");
require("dotenv").config();

const mapRow = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  file_src: `/api/podcast/${row.id}/stream`,
  download_src: `/api/podcast/${row.id}/file`,
});

exports.list = async () => {
  const res = await db.query(
    `SELECT id, title, description, path FROM music WHERE type = 'podcast' ORDER BY id ASC`
  );
  return res.rows.map(mapRow);
};

exports.getById = async (id) => {
  const res = await db.query(
    `SELECT id, title, description, path FROM music WHERE type = 'podcast' AND id = $1 LIMIT 1`,
    [id]
  );
  if (!res.rows[0]) return null;
  return mapRow(res.rows[0]);
};

exports.getFilePath = async (id) => {
  const res = await db.query(
    `SELECT path FROM music WHERE type = 'podcast' AND id = $1 LIMIT 1`,
    [id]
  );
  if (!res.rows[0] || !res.rows[0].path) return null;
  return res.rows[0].path;
};
