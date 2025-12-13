const express = require("express");
const router = express.Router();
const shortController = require("../controllers/short.controller");

router.post("/renew", shortController.renewShort);

module.exports = router;
