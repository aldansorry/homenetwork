const Queue = require("better-queue");
const ytdlp = require("yt-dlp-exec");
const fs = require("fs");
const path = require("path");
const NodeID3 = require("node-id3");
const crypto = require("crypto");

const MUSIC_PATH = "/app/data/music";
const PODCAST_PATH = "/app/data/podcast";
const VIDEO_ROOT = "/app/data/video/youtube/download";

const getDestinationPath = (type = "Music") => {
  const normalized = type.toLowerCase();
  if (normalized === "video") {
    if (!fs.existsSync(VIDEO_ROOT)) {
      fs.mkdirSync(VIDEO_ROOT, { recursive: true });
    }
    return VIDEO_ROOT;
  }
  return normalized === "podcast" ? PODCAST_PATH : MUSIC_PATH;
};

const youtubeQueue = new Queue(
  (task, cb) => {
    console.log(
      `[QUEUE START] Memulai job ${task.jobId} untuk URL: ${task.url} (type: ${task.type})`
    );

    const url = task.url;
    const type = task.type || "Music";
    const destinationPath = getDestinationPath(type);

    if (!destinationPath) {
      return cb(new Error(`Path tujuan untuk type ${type} belum dikonfigurasi`));
    }

    // Step 1: Ambil metadata
    ytdlp(url, { dumpSingleJson: true })
      .then((info) => {
        let title_pure = info.title;
        let title = info.title.replace(/[^\w\s.-]/g, "").trim();
        if (title === "") {
          title = crypto.randomBytes(8).toString("hex");
        }
        console.log(`[QUEUE INFO]${title}`);

        const isVideo = type.toLowerCase() === "video";
        const outputExt = isVideo ? "mp4" : "mp3";
        const outputPath = path.join(destinationPath, `${title}.${outputExt}`);

        // Step 2: Jika sudah ada file cached
        if (fs.existsSync(outputPath)) {
          console.log(`[QUEUE CACHE] Job ${task.jobId} pakai cache: ${outputPath}`);

          if (!isVideo) {
            const tags = {
              title: title_pure,
              artist: info.uploader,
              album: info.webpage_url,
            };
            NodeID3.write(tags, outputPath);
          }

          return cb(null, {
            status: "cached",
            title,
            type,
            file: outputPath,
          });
        }

        // Step 3: Mulai download yt-dlp
        const ytOptions = isVideo
          ? {
              format: "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best",
              mergeOutputFormat: "mp4",
              output: outputPath,
            }
          : {
              extractAudio: true,
              audioFormat: "mp3",
              audioQuality: 0,
              output: outputPath,
            };

        const proc = ytdlp.exec(url, ytOptions);

        proc.on("exit", (code) => {
          if (code === 0) {
            console.log(`[QUEUE DONE] Job ${task.jobId} selesai. File: ${outputPath}`);

            if (!isVideo) {
              const tags = {
                title: title_pure,
                artist: info.uploader,
                album: info.webpage_url,
              };
              NodeID3.write(tags, outputPath);
            }

            cb(null, {
              status: "success",
              title,
              type,
              file: outputPath,
            });
          } else {
            console.log(`[QUEUE ERROR] Job ${task.jobId} gagal dengan exit code ${code}`);
            cb(new Error("yt-dlp exit code: " + code));
          }
        });

        proc.on("error", (err) => {
          console.log(`[QUEUE ERROR] Job ${task.jobId} gagal: ${err.message}`);
          cb(err);
        });
      })
      .catch((err) => {
        console.log(`[QUEUE ERROR] Job ${task.jobId} gagal: ${err.message}`);
        cb(err);
      });
  },
  {
    concurrent: 1, // hanya satu job diproses pada satu waktu
    maxRetries: 1,
  }
);

module.exports = youtubeQueue;
