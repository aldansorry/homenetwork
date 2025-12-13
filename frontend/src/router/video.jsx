import { Route } from "react-router-dom";
import Video from "../pages/Video";
import VideoDetail from "../pages/VideoDetail";
import VideoPlayer from "../pages/VideoPlayer";

export const VideoRoutes = (
  <>
    <Route path="/video" element={<Video />} />
    <Route path="/video/:title" element={<VideoDetail />} />
    <Route path="/video/:title/:series" element={<VideoPlayer />} />
    <Route path="/video/:title/:series/:episode" element={<VideoPlayer />} />
  </>
);
