import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  FaFolder,
  FaFileAlt,
  FaFilePdf,
  FaFileVideo,
  FaFileAudio,
  FaFileImage,
  FaChevronRight,
  FaUpload
} from "react-icons/fa";
import MenuBar from "../components/MenuBar";
import api from "../api/axios";

export default function File() {
  const navigate = useNavigate();
  const location = useLocation();
  const { "*": any } = useParams();
  const [list_file, setListFile] = useState([]);
  const [refreshFile, setRefreshFile] = useState(0);

  const currentPath = any ? `/file/${any}` : "/file";

  // SAMPLE FOLDER TREE


  // SAMPLE LIST FILE
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await api.get("/api/file/find/" + (any ?? ''));

        const items = res.data.data.items;

        const mapped = items.map(item => ({
          filename: item.name,
          file_path: item.type === "directory" ? location.pathname + "/" + item.name : item.apiPath,                  // path API
          type: item.type === "directory" ? "folder" : "file",
          extension: item.extension || null
        }));

        setListFile(mapped);

      } catch (err) {
        console.error("Gagal fetch files:", err);
      }
    };

    fetchFiles();
  }, [location.pathname, refreshFile]);

  // STATES
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [moveFilePath, setMoveFilePath] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState("");

  // OPEN ITEM
  const openItem = (item) => {
    if (item.type === "folder") {
      navigate(item.file_path);
    } else {
      setSelectedFile(item);
      setModalOpen(true);
    }
  };

  const downloadFile = (path, file_name) => {
    const url = api.defaults.baseURL + path;

    const a = document.createElement("a");
    a.href = url;
    a.download = file_name;
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const selectFileToMove = () => {
    setMoveFilePath(selectedFile.file_path);
    setModalOpen(false);
  };

  const moveFileToCurrent = async () => {
    if (!moveFilePath) {
      return alert("Pilih file terlebih dahulu melalui modal file.");
    }

    try {
      const cleanFilePath = moveFilePath.replace("/api/file/find/", "");

      await api.post("/api/file/move", {
        file_path: cleanFilePath,
        dir_path: any ?? ""
      });

      alert("MOVE SUCCESS");
      setMoveFilePath(null);
      setRefreshFile(!refreshFile);
    } catch (err) {
      console.error("Move Error:", err);
      alert("MOVE FAILED");
    }
  };

  const uploadToServer = async () => {
    if (!uploadFile) return alert("Choose a file first");

    try {
      const form = new FormData();
      form.append("file", uploadFile);

      if (uploadName.trim() !== "") {
        form.append("name", uploadName.trim());
      }

      const res = await api.post(
        "/api/file/upload/" + (any ?? ''),
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          },
          onUploadProgress: (p) => {
            const percent = Math.round((p.loaded * 100) / p.total);
            console.log("UPLOAD PROGRESS:", percent + "%");
          }
        }
      );

      console.log("Upload Success:", res.data);

      alert("UPLOAD SUCCESS");
      setRefreshFile(!refreshFile);
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadName("");

    } catch (err) {
      console.error("Upload Error:", err);
      alert("UPLOAD FAILED");
    }
  };

  // ICON SELECTOR
  const getIcon = (item) => {
    if (item.type === "folder") return <FaFolder className="text-yellow-500 text-5xl" />;

    switch (item.extension) {
      case "pdf": return <FaFilePdf className="text-red-500 text-5xl" />;
      case "mp4": return <FaFileVideo className="text-blue-500 text-5xl" />;
      case "mp3": return <FaFileAudio className="text-green-500 text-5xl" />;
      case "jpg":
      case "jpeg":
      case "png": return <FaFileImage className="text-purple-500 text-5xl" />;
      default: return <FaFileAlt className="text-gray-500 text-5xl" />;
    }
  };

  // BREADCRUMB
  const breadcrumbParts = currentPath
    .replace("/file", "")
    .split("/")
    .filter(Boolean);

  const breadcrumbPaths = breadcrumbParts.map((_, i) => {
    return "/file/" + breadcrumbParts.slice(0, i + 1).join("/");
  });

  return (
    <div className="p-6">
      <MenuBar title="File" />
      <div className="flex h-screen">

        {/* MAIN CONTENT */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto pb-20 pt-14">

          {/* BREADCRUMB */}
          <div className="flex items-center justify-between">

            <div className="flex items-center gap-2 text-gray-700 text-sm flex-wrap">
              <span
                className="cursor-pointer hover:text-green-600"
                onClick={() => navigate("/file")}
              >
                File
              </span>

              {breadcrumbParts.map((part, i) => (
                <div key={i} className="flex items-center gap-2">
                  <FaChevronRight className="text-gray-400 text-xs" />
                  <span
                    className="cursor-pointer hover:text-green-600"
                    onClick={() => navigate(breadcrumbPaths[i])}
                  >
                    {decodeURIComponent(part)}
                  </span>
                </div>
              ))}
            </div>

            {/* UPLOAD / MOVE BUTTON */}
            <button
              onClick={() => moveFilePath ? moveFileToCurrent() : setUploadModalOpen(true)}
              className="
              flex items-center gap-2 
              bg-green-600 hover:bg-green-700 
              text-white px-4 py-2 rounded-lg
            "
            >
              <FaUpload /> {moveFilePath ? "Move" : "Upload"}
            </button>
          </div>

          {moveFilePath && (
            <div className="text-sm text-gray-600 bg-green-50 border border-green-100 px-3 py-2 rounded-lg">
              File to move: {moveFilePath}
            </div>
          )}

          {/* TITLE */}
          <h1 className="text-2xl font-bold text-center">Files</h1>

          {/* GRID */}
          <div
            className="
            grid 
            grid-cols-2 
            sm:grid-cols-3 
            md:grid-cols-4 
            lg:grid-cols-6 
            gap-6
          "
          >
            {list_file.map((item, i) => (
              <div
                key={i}
                onClick={() => openItem(item)}
                className="
                flex flex-col items-center justify-center 
                p-4 rounded-xl cursor-pointer 
                hover:bg-white hover:shadow-lg transition
              "
              >
                {getIcon(item)}
                <div className="text-center text-sm mt-2 break-all">
                  {item.filename}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FILE PREVIEW MODAL */}
        {modalOpen && (
          <div className="
          fixed inset-0 flex items-center justify-center 
          bg-black/40 backdrop-blur-sm z-50
        ">
            <div className="bg-white rounded-xl shadow-xl p-6 w-80">

              <h2 className="text-xl font-bold text-center mb-4">
                {selectedFile.filename}
              </h2>

              <a
                onClick={() => downloadFile(selectedFile.file_path, selectedFile.filename)}
                download
                className="
                block w-full text-center 
                bg-green-600 hover:bg-green-700 
                text-white font-semibold py-2 rounded-lg mb-3
              "
              >
                Download
              </a>

              <button
                onClick={selectFileToMove}
                className="
                w-full text-center 
                bg-blue-600 hover:bg-blue-700 
                text-white font-semibold py-2 rounded-lg mb-3
              "
              >
                Move
              </button>

              <button
                onClick={() => setModalOpen(false)}
                className="
                w-full text-center 
                bg-gray-200 hover:bg-gray-300 
                text-gray-700 font-semibold py-2 rounded-lg
              "
              >
                Close
              </button>

            </div>
          </div>
        )}

        {/* UPLOAD MODAL */}
        {uploadModalOpen && (
          <div className="
          fixed inset-0 flex items-center justify-center 
          bg-black/40 backdrop-blur-sm z-50
        ">
            <div className="bg-white rounded-xl shadow-xl p-6 w-96">

              <h2 className="text-xl font-bold text-center mb-4">Upload File</h2>

              <div className="space-y-4">

                {/* CHOOSE FILE */}
                <div>
                  <label className="font-semibold text-sm">Choose File</label>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="mt-1 block w-full"
                  />
                </div>

                {/* OPTIONAL NAME */}
                <div>
                  <label className="font-semibold text-sm">Rename (optional)</label>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    className="mt-1 block w-full border rounded px-3 py-2"
                    placeholder="Keep empty to use original name"
                  />
                </div>

                {/* BUTTONS */}
                <button
                  onClick={uploadToServer}
                  className="
                  w-full text-center 
                  bg-green-600 hover:bg-green-700 
                  text-white font-semibold py-2 rounded-lg
                "
                >
                  Upload
                </button>

                <button
                  onClick={() => {
                    setUploadModalOpen(false);
                    setUploadFile(null);
                    setUploadName("");
                  }}
                  className="
                  w-full text-center mt-1
                  bg-gray-200 hover:bg-gray-300 
                  text-gray-700 font-semibold py-2 rounded-lg
                "
                >
                  Cancel
                </button>

              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
