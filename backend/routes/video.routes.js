const express = require("express");
const router = express.Router();
const videoController = require("../controllers/video.controller");

// list all video folders
router.get("/", videoController.getAllVideos);

// get detail by title
router.get("/:title", videoController.getVideoSeries);
router.get("/:title/cover", videoController.getCover);
router.get("/:title/:series", videoController.getVideoDetail);

// stream episode
router.get("/:title/:series/stream/:episode", videoController.streamEpisode);

module.exports = router;
