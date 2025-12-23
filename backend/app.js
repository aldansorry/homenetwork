const express = require("express");
const app = express();
const cors = require("cors");

require("dotenv").config();

app.use(cors());

app.use(express.json());

// api modules
app.use("/api/file", require("./routes/file.routes"));
app.use("/api/music", require("./routes/music.routes"));
app.use("/api/podcast", require("./routes/podcast.routes"));
app.use("/api/short", require("./routes/short.routes"));
app.use("/api/video", require("./routes/video.routes"));
app.use("/api/youtubedownloader", require("./routes/youtubeDownloader.routes"));
app.use("/api/sync", require("./routes/sync.routes"));

module.exports = app;
