const youtubeQueue = require("../queues/youtube.queue");
const { success, failed } = require("../utils/response");

exports.handleDownload = async (req, res) => {
    const url = req.query.url;
    const type = req.query.type || "Music";
    const allowedTypes = ["Music", "Podcast"];

    if (!url) {
        return res.status(400).json({
            status: "error",
            message: "Parameter url wajib diisi",
        });
    }

    if (!allowedTypes.includes(type)) {
        return res.status(400).json({
            status: "error",
            message: "Parameter type harus 'Music' atau 'Podcast'",
        });
    }

    const jobId = Date.now().toString();

    youtubeQueue.push({ url, jobId, type });
    console.log(`[QUEUE ADDED] Job ${jobId} ditambahkan ke antrian dengan URL: ${url} (type: ${type})`);

    return res.json({
        status: "processing",
        jobId,
        type,
        message: "Sedang diproses, tunggu beberapa saat lagi"
    });
};
