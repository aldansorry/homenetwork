const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const upload = require("../middleware/upload.middleware");
const fileService = require("../services/file.service");
const fs = require("fs");


// FIND — catch everything under /find
router.get("/find/", fileController.find);
router.get("/find/*segments", fileController.find);

// UPLOAD — catch everything under /upload
router.post("/upload/", upload.single("file"), fileController.upload);
router.post("/upload/*segments", upload.single("file"), fileController.upload);

// MOVE
router.post("/move", fileController.move);

module.exports = router;
