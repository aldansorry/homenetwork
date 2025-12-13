const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("MULTER DEST:", req.uploadTarget); // 👈 TEST
    cb(null, "/app/data");
  },
  filename: (req, file, cb) => {
    console.log("MULTER FILE:", file.originalname); // 👈 TEST
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

module.exports = upload;
