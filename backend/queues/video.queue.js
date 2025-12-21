const Queue = require("better-queue");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const videoService = require("../services/video.service");

const videoRoot = "/app/data/video";

const run7z = (args, cwd) => {
  return new Promise((resolve, reject) => {
    const proc = spawn("7z", args, { cwd });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => reject(err));

    proc.on("close", (code) => {
      if (code === 0) {
        return resolve({ stdout, stderr });
      }

      const message = stderr || stdout || `7z exited with code ${code}`;
      return reject(new Error(message));
    });
  });
};

const queue = new Queue(
  async (task, cb) => {
    const jobId = task.jobId || Date.now().toString();
    const action = task.action;
    const { title, series } = task;
    const titleRoot = path.join(videoRoot, title);

    try {
      console.log(`[VIDEO QUEUE] [${jobId}] Start: ${action} -> title=${title} series=${series}`);

      if (action === "archive") {
        const requestedFormat = (task.format || "7z").replace(/^\./, "") || "7z";
        const format = ["7z", "zip"].includes(requestedFormat.toLowerCase())
          ? requestedFormat.toLowerCase()
          : "7z";
        const overwrite = Boolean(task.overwrite);
        const sourceDir = videoService.getSeriesPath(title, series);
        const archivePath = videoService.getArchivePath(title, series, format);
        const typeFlag = format === "zip" ? "-tzip" : "-t7z";

        if (!fs.existsSync(titleRoot)) {
          throw new Error(`Title folder not found: ${titleRoot}`);
        }

        if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
          throw new Error(`Source folder not found: ${sourceDir}`);
        }

        if (fs.existsSync(archivePath)) {
          if (!overwrite) {
            throw new Error(`Archive already exists: ${archivePath}`);
          }
          fs.unlinkSync(archivePath);
        }

        console.log(`[VIDEO QUEUE] [${jobId}] Archiving ${sourceDir} -> ${archivePath}`);
        console.log(`[VIDEO QUEUE] [${jobId}] Proses: running 7z archive (${format})`);

        await run7z(
          ["a", typeFlag, path.basename(archivePath), series, "-mx=5"],
          titleRoot
        );

        console.log(`[VIDEO QUEUE] [${jobId}] Selesai: archive created`);

        return cb(null, {
          status: "archived",
          archive: archivePath,
          title,
          series,
          jobId,
        });
      }

      if (action === "extract") {
        const archiveName = task.archiveName || series;
        const archivePath = videoService.findArchiveFile(title, archiveName);

        if (!archivePath) {
          throw new Error(`Archive not found for ${archiveName}`);
        }

        const archiveFile = path.basename(archivePath);
        const baseName = videoService.getArchiveBaseName(archiveFile);

        // Default: extract in-place (same folder as archive) to avoid extra nesting
        const defaultDestination = path.dirname(archivePath);
        const destinationCandidate = task.destination
          ? path.join(titleRoot, task.destination)
          : defaultDestination;

        const destinationBase = path.normalize(destinationCandidate);

        if (!destinationBase.startsWith(titleRoot)) {
          throw new Error("Destination path must stay inside video directory");
        }

        if (fs.existsSync(destinationBase)) {
          const hasContent = fs.readdirSync(destinationBase).length > 0;
          const isDefaultPath = destinationBase === defaultDestination;

          // For default "extract here", allow extracting into non-empty folder without wiping.
          if (!isDefaultPath) {
            if (hasContent && !task.overwrite) {
              throw new Error(
                "Destination folder is not empty. Set overwrite=true to replace it."
              );
            }
            if (hasContent && task.overwrite) {
              fs.rmSync(destinationBase, { recursive: true, force: true });
            }
          }
        }

        if (!fs.existsSync(destinationBase)) {
          fs.mkdirSync(destinationBase, { recursive: true });
        }

        const cwd = path.dirname(archivePath);
        console.log(`[VIDEO QUEUE] [${jobId}] Extracting ${archivePath} -> ${destinationBase}`);
        console.log(`[VIDEO QUEUE] [${jobId}] Proses: running 7z extract`);
        console.log(archiveFile);
        await run7z(["x", archiveFile, `-o${destinationBase}`, "-y"], cwd);

        console.log(`[VIDEO QUEUE] [${jobId}] Selesai: extract completed`);

        return cb(null, {
          status: "extracted",
          archive: archivePath,
          output: destinationBase,
          title,
          series: videoService.getArchiveBaseName(archiveFile),
          jobId,
        });
      }

      throw new Error(`Unknown action: ${action}`);
    } catch (err) {
      console.error(`[VIDEO QUEUE ERROR] [${jobId}] Gagal: ${err.message}`);
      return cb(err);
    }
  },
  {
    concurrent: 1,
    maxRetries: 1,
  }
);

// Log when task is created/queued
const originalPush = queue.push.bind(queue);
queue.push = (task, cb) => {
  const jobId = task && task.jobId ? task.jobId : Date.now().toString();
  console.log(`[VIDEO QUEUE] [${jobId}] Dibuat: ${task?.action || "unknown"} request`);
  return originalPush({ ...task, jobId }, cb);
};

module.exports = queue;
