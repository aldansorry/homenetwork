const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { readDir, readFile } = require("./utils/filesystem.util");
require("dotenv").config();

const videoRoot = "/app/data/video";
const musicDir = "/app/data/music";
const podcastDir = "/app/data/podcast";

const config = {
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || "db",
  port: Number(process.env.DB_PORT || process.env.POSTGRES_PORT || 5432),
  user: process.env.DB_USER || process.env.POSTGRES_USER || "postgres",
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || "postgres",
  database: process.env.DB_NAME || process.env.POSTGRES_DB || "homenetwork",
};

const log = (...args) => console.log("[SYNC]", ...args);

const upsertVideo = async (client, item) => {
  const query = `
    INSERT INTO videos (title, series, description, path, status)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (title, series)
    DO UPDATE SET
      description = EXCLUDED.description,
      path = EXCLUDED.path,
      status = EXCLUDED.status
    RETURNING id;
  `;
  const values = [
    item.title,
    item.series,
    item.description || null,
    item.path,
    item.status || "ready",
  ];
  await client.query(query, values);
};

const upsertMusic = async (client, item) => {
  const query = `
    INSERT INTO music (type, title, category, description, path)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (type, title)
    DO UPDATE SET
      category = EXCLUDED.category,
      description = EXCLUDED.description,
      path = EXCLUDED.path;
  `;
  const values = [
    item.type || "music",
    item.title,
    item.category || null,
    item.description || null,
    item.path || null,
  ];
  await client.query(query, values);
};

const collectVideos = () => {
  const titles = readDir(videoRoot);
  const results = [];

  titles.forEach((title) => {
    const titlePath = path.join(videoRoot, title);
    const seriesFolders = readDir(titlePath);

    seriesFolders.forEach((series) => {
      results.push({
        title,
        series,
        path: path.join(titlePath, series),
        status: "ready",
      });
    });
  });

  return results;
};

const collectMusic = () => {
  const results = [];

  // Category folders: each folder name is category
  const categories = readDir(musicDir);
  categories.forEach((cat) => {
    const catPath = path.join(musicDir, cat);
    const files = readFile(catPath);
    files.forEach((filename) => {
      results.push({
        type: "music",
        title: path.parse(filename).name,
        category: cat,
        path: path.join(catPath, filename),
      });
    });
  });

  // Files directly under musicDir (no category)
  const rootFiles = readFile(musicDir);
  rootFiles.forEach((filename) => {
    results.push({
      type: "music",
      title: path.parse(filename).name,
      category: null,
      path: path.join(musicDir, filename),
    });
  });

  return results;
};

const collectPodcasts = () => {
  const files = readFile(podcastDir);
  return files.map((filename) => ({
    type: "podcast",
    title: path.parse(filename).name,
    path: path.join(podcastDir, filename),
  }));
};

async function runSyncMedia() {
  const client = new Client(config);
  await client.connect();
  try {
    await client.query("BEGIN");

    const videos = collectVideos();
    const musics = collectMusic();
    const podcasts = collectPodcasts();

    log("Clearing existing media data from database...");
    await client.query("TRUNCATE TABLE videos;");
    await client.query(`DELETE FROM music WHERE type IN ('music', 'podcast');`);

    log(
      `Found ${videos.length} video entries, ${musics.length} music entries, and ${podcasts.length} podcast entries to sync.`
    );

    for (const item of videos) {
      await upsertVideo(client, item);
    }

    for (const item of musics) {
      await upsertMusic(client, item);
    }

    for (const item of podcasts) {
      await upsertMusic(client, item);
    }

    await client.query("COMMIT");
    log("Sync completed.");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[SYNC ERROR]", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

module.exports = { runSyncMedia };

// Allow running as standalone script (e.g. npm run sync:media)
if (require.main === module) {
  runSyncMedia();
}
