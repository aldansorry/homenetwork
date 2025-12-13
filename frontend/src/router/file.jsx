import { Route } from "react-router-dom";
import File from "../pages/File";

export const FileRoutes = (
  <>
    <Route path="/file" element={<File />} />
    <Route path="/file/*" element={<File />} />
  </>
);
