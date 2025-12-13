import { Route } from "react-router-dom";
import Home from "../pages/Home";
import YoutubeDownloader from "../pages/YoutubeDownloader";

export const HomeRoutes = (
  <>
    <Route path="/" element={<Home />} />
    <Route path="/youtube-downloader" element={<YoutubeDownloader />} />
  </>
);
