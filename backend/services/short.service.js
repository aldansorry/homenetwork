const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ytdlp = require("yt-dlp-exec");
require("dotenv").config();

const shortConfig = {
  outputDir: "/app/data/short",
  topics:
    [
      "anime",
      "one piece",
      "gus baha",
      "indonesia",
    ],
  searchLimit: Number(2),
  allowedHosts: [
    "youtube.com",
    "youtu.be",
    "instagram.com",
    "www.instagram.com",
    "tiktok.com",
    "vm.tiktok.com",
    "m.tiktok.com",
  ],
  format: "bv*+ba/b",
  mergeOutputFormat: "mp4",
};

const sanitize = (value = "") =>
  value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const validateUrl = (url) => {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const supported = shortConfig.allowedHosts.some((host) =>
      hostname.includes(host)
    );
    if (!supported) {
      throw new Error("Unsupported platform");
    }
    return parsed.toString();
  } catch (err) {
    throw new Error("URL tidak valid atau platform tidak didukung");
  }
};

const getFilename = (info) => {
  const base = sanitize(info?.title) || "short";
  const id = sanitize(info?.id) || crypto.randomBytes(4).toString("hex");
  return `${base}-${id}.mp4`;
};

const downloadSingle = async (url) => {
  if (!shortConfig.outputDir) {
    throw new Error("SHORT_PATH belum dikonfigurasi");
  }

  const normalizedUrl = validateUrl(url);
  ensureDir(shortConfig.outputDir);

  const info = await ytdlp(normalizedUrl, { dumpSingleJson: true });
  const filename = getFilename(info);
  const outputPath = path.join(shortConfig.outputDir, filename);

  if (fs.existsSync(outputPath)) {
    return {
      url: normalizedUrl,
      status: "cached",
      filename,
      path: outputPath,
    };
  }

  await ytdlp(normalizedUrl, {
    output: outputPath,
    format: shortConfig.format,
    mergeOutputFormat: shortConfig.mergeOutputFormat,
    noPart: true,
    quiet: true,
  });

  return {
    url: normalizedUrl,
    status: "downloaded",
    filename,
    path: outputPath,
  };
};

const searchTargets = [
  {
    platform: "youtube",
    buildQuery: (topic, limit) => `ytsearch${limit}:${topic} shorts`,
  },
];

const discoverByTopic = async (topic) => {
  console.log('[TEST]');
  const collected = [];

  for (const target of searchTargets) {
    try {
      const info = await ytdlp(target.buildQuery(topic, shortConfig.searchLimit), {
        dumpSingleJson: true,
        flatPlaylist: true,
        defaultSearch: "auto",
        quiet: true,
      });
      console.log('[INFOO]' + info);

      (info?.entries || []).forEach((entry) => {
        const entryUrl = entry?.webpage_url || entry?.url || entry?.original_url;
        if (entryUrl) {
          collected.push({
            url: entryUrl,
            platform: target.platform,
            title: entry?.title,
            topic,
          });
        }
      });
    } catch (err) {
      console.log('ERROR', err);
      collected.push({
        url: null,
        platform: target.platform,
        topic,
        status: "failed",
        error: `Gagal menemukan konten: ${err.message}`,
      });
    }
  }

  return collected;
};

exports.renewShorts = async (topicsInput = []) => {
  const topics = Array.isArray(topicsInput)
    ? topicsInput.filter(Boolean)
    : [];

  const topicsToUse = topics.length > 0 ? topics : shortConfig.topics;

  if (!topicsToUse.length) {
    throw new Error("Topik short tidak tersedia");
  }

  const results = [];
  const discoveredUrls = [];

  for (const topic of topicsToUse) {
    const found = await discoverByTopic(topic);
    discoveredUrls.push(...found);
  }

  const searchFailures = discoveredUrls.filter((item) => !item.url && item.status);

  const uniqueUrls = Array.from(
    new Map(
      discoveredUrls
        .filter((item) => item.url)
        .map((item) => [item.url, item])
    ).values()
  );

  if (uniqueUrls.length === 0) {
    throw new Error("Tidak menemukan URL untuk topik yang diberikan");
  }

  for (const item of uniqueUrls) {
    try {
      const downloadResult = await downloadSingle(item.url);
      results.push({
        ...downloadResult,
        platform: item.platform,
        topic: item.topic,
      });
    } catch (err) {
      results.push({
        url: item.url,
        platform: item.platform,
        topic: item.topic,
        status: "failed",
        error: err.message,
      });
    }
  }

  return {
    topics: topicsToUse,
    discovered: uniqueUrls.length,
    items: [...searchFailures, ...results],
  };
};
