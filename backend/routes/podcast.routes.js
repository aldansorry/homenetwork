const express = require("express");
const router = express.Router();
const podcastController = require("../controllers/podcast.controller");

router.get("/", podcastController.getAllPodcast);
router.get("/:id/stream", podcastController.streamPodcast);
router.get("/:id/file", podcastController.downloadPodcast);

module.exports = router;
