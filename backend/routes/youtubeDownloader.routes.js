const express = require("express");
const router = express.Router();
const {
    handleDownload
} = require("../controllers/youtubeDownloader.controller");

// Download video
router.get("/", handleDownload);

module.exports = router;
