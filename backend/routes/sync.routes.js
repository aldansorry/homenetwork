const express = require("express");
const router = express.Router();
const { syncMedia } = require("../controllers/sync.controller");

router.post("/media", syncMedia);

module.exports = router;
