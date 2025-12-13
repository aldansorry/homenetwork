import { Route } from "react-router-dom";
import Podcast from "../pages/Podcast";

export const PodcastRoutes = (
  <>
    <Route path="/podcast" element={<Podcast />} />
  </>
);
