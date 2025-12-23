const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { readDir, readFile } = require("./utils/filesystem.util");
const videoService = require("./services/video.service");
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
    const files = readFile(titlePath);

    // Series folders => status ready
    seriesFolders.forEach((series) => {
      results.push({
        title,
        series,
        path: path.join(titlePath, series),
        status: "ready",
      });
    });

    // Archive files => status archive
    files.forEach((file) => {
      const lower = file.toLowerCase();
      const isArchive = videoService.archiveExtensions.some((ext) =>
        lower.endsWith(`.${ext.toLowerCase()}`)
      );
      if (isArchive) {
        results.push({
          title,
          series: videoService.getArchiveBaseName(file),
          path: path.join(titlePath, file),
          status: "archive",
        });
      }
    });
  });

  return results;
};

const collectMusic = () => {
  const files = readFile(musicDir);
  return files.map((filename) => ({
    type: "music",
    title: path.parse(filename).name,
    path: path.join(musicDir, filename),
  }));
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
    const videos = collectVideos();
    const musics = collectMusic();
    const podcasts = collectPodcasts();

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

    log("Sync completed.");
  } catch (err) {
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
