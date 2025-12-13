const express = require("express");
const router = express.Router();
const musicController = require("../controllers/music.controller");

router.get("/", musicController.getAllMusic);
router.get("/kategori", musicController.getCategories);
router.get("/kategori/uncategorized", musicController.getUncategorizedMusic);
router.get("/kategori/:kategori", musicController.getMusicByCategory);
router.get("/:id/stream", musicController.streamMusic);
router.get("/:id/file", musicController.downloadMusic);
router.post("/:id/set/:kategori", musicController.setMusicCategory);
router.get("/:id", musicController.getMusicById);

module.exports = router;
