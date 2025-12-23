const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const upload = require("../middleware/upload.middleware");

// FIND — catch everything under /find
router.get("/find/", fileController.find);
router.get("/find/*segments", fileController.find);

// STREAM — catch everything under /stream
router.get("/stream/", fileController.stream);
router.get("/stream/*segments", fileController.stream);

// ARCHIVE / EXTRACT
router.post("/archive", fileController.archive);
router.post("/extract", fileController.extract);

// UPLOAD — catch everything under /upload
router.post("/upload/", upload.single("file"), fileController.upload);
router.post("/upload/*segments", upload.single("file"), fileController.upload);

// MOVE
router.post("/move", fileController.move);

module.exports = router;
