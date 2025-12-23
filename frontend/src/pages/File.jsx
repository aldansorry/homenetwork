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
  FaUpload,
  FaPlay
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

        const mapped = items.map(item => {
          const isFolder = item.type === "directory";
          const streamPath = !isFolder
            ? item.apiPath.replace("/find/", "/stream/")
            : null;
          const relativePath = item.apiPath.replace("/api/file/find/", "");

          return {
            filename: item.name,
            file_path: isFolder ? location.pathname + "/" + item.name : item.apiPath,                  // path API
            type: isFolder ? "folder" : "file",
            extension: item.extension || null,
            stream_path: streamPath,
            relative_path: relativePath
          };
        });

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
  const [player, setPlayer] = useState(null); // {type, src, name}
  const [actionMessage, setActionMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState({
    open: false,
    action: null,
    item: null,
    status: "idle",
    message: "",
  });

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
    const sizeClass = "text-2xl";
    if (item.type === "folder") return <FaFolder className={`text-yellow-500 ${sizeClass}`} />;

    switch (item.extension) {
      case "pdf": return <FaFilePdf className={`text-red-500 ${sizeClass}`} />;
      case "mp4": return <FaFileVideo className={`text-blue-500 ${sizeClass}`} />;
      case "mp3": return <FaFileAudio className={`text-green-500 ${sizeClass}`} />;
      case "jpg":
      case "jpeg":
      case "png": return <FaFileImage className={`text-purple-500 ${sizeClass}`} />;
      default: return <FaFileAlt className={`text-gray-500 ${sizeClass}`} />;
    }
  };

  const mediaType = (ext = "") => {
    const lower = (ext || "").toLowerCase();
    const videoExt = ["mp4", "mkv", "webm", "avi", "mov", "m4v"];
    const audioExt = ["mp3", "weba", "ogg", "oga", "wav", "flac", "aac", "m4a"];
    if (videoExt.includes(lower)) return "video";
    if (audioExt.includes(lower)) return "audio";
    return null;
  };

  const archiveExt = ["7z", "zip", "rar", "gz", "tgz", "tar", "tar.gz", "tbz2", "tar.bz2", "txz", "tar.xz", "wim"];

  const showMessage = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(""), 3000);
  };

  const openPlayer = (item) => {
    const type = mediaType(item.extension);
    if (!type || !item.stream_path) return;
    setPlayer({
      type,
      src: api.defaults.baseURL + item.stream_path,
      name: item.filename,
    });
  };

  const archiveFolder = async (item) => {
    setConfirmAction({
      open: true,
      action: "archive",
      item,
      status: "idle",
      message: "",
    });
  };

  const extractArchive = async (item) => {
    setConfirmAction({
      open: true,
      action: "extract",
      item,
      status: "idle",
      message: "",
    });
  };

  const performConfirmedAction = async () => {
    const { action, item } = confirmAction;
    if (!item?.relative_path || !action) return;
    setConfirmAction((prev) => ({ ...prev, status: "loading", message: "" }));
    try {
      if (action === "archive") {
        await api.post("/api/file/archive", { path: item.relative_path });
        setConfirmAction((prev) => ({ ...prev, status: "done", message: "Archive created." }));
      } else if (action === "extract") {
        await api.post("/api/file/extract", { path: item.relative_path, overwrite: true });
        setConfirmAction((prev) => ({ ...prev, status: "done", message: "Extract completed." }));
      }
      setRefreshFile((r) => !r);
    } catch (err) {
      console.error(`${action} failed:`, err);
      setConfirmAction((prev) => ({
        ...prev,
        status: "done",
        message: `${action === "archive" ? "Archive" : "Extract"} failed.`,
      }));
    }
  };

  const closeConfirm = () => {
    setConfirmAction({ open: false, action: null, item: null, status: "idle", message: "" });
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

          {actionMessage && (
            <div className="text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded px-3 py-2 inline-block">
              {actionMessage}
            </div>
          )}

          {/* TITLE */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-800">Files</h1>
            <span className="text-xs text-gray-500">{list_file.length} items</span>
          </div>

          {/* LIST */}
          <div className="bg-white rounded-xl shadow-sm border divide-y">
            {list_file.map((item, i) => {
              const mType = mediaType(item.extension);
              const isArchive = archiveExt.includes((item.extension || "").toLowerCase());
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => openItem(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openItem(item);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition outline-none focus:ring-2 focus:ring-green-500"
                >
                  <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-md shrink-0">
                    {getIcon(item)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{item.filename}</div>
                    <div className="text-xs text-gray-500">
                      {item.type === "folder" ? "Folder" : (item.extension || "File")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {mType && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openPlayer(item);
                        }}
                        className="px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100"
                      >
                        <span className="inline-flex items-center gap-1">
                          <FaPlay className="text-[10px]" /> Play
                        </span>
                      </button>
                    )}
                    {item.type === "folder" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveFolder(item);
                        }}
                        className="px-3 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-semibold hover:bg-amber-100"
                      >
                        Archive
                      </button>
                    )}
                    {isArchive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          extractArchive(item);
                        }}
                        className="px-3 py-1 rounded-md bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100"
                      >
                        Extract
                      </button>
                    )}
                    <FaChevronRight className="text-gray-300" />
                  </div>
                </div>
              );
            })}
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

        {/* PLAYER MODAL */}
        {player && (
          <div className="
          fixed inset-0 flex items-center justify-center 
          bg-black/50 backdrop-blur-sm z-50 p-4
        ">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 uppercase tracking-wide">Playing</div>
                  <div className="text-lg font-semibold text-gray-800 truncate">{player.name}</div>
                </div>
                <button
                  onClick={() => setPlayer(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none px-2"
                  aria-label="Close player"
                >
                  &times;
                </button>
              </div>
              <div className="w-full">
                {player.type === "video" ? (
                  <video
                    src={player.src}
                    controls
                    autoPlay
                    className="w-full max-h-[70vh] bg-black rounded-lg"
                  />
                ) : (
                  <audio src={player.src} controls autoPlay className="w-full" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* CONFIRM ACTION MODAL */}
        {confirmAction.open && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold capitalize">
                  {confirmAction.action === "archive" ? "Archive Folder" : "Extract Archive"}
                </h3>
                <button
                  onClick={closeConfirm}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="text-sm text-gray-700">
                <div className="font-semibold">{confirmAction.item?.filename}</div>
                <div className="text-xs text-gray-500 break-all">
                  {confirmAction.item?.relative_path}
                </div>
              </div>

              {confirmAction.status === "done" && (
                <div className="text-sm px-3 py-2 rounded bg-green-50 border border-green-100 text-green-700">
                  {confirmAction.message || "Action completed."}
                </div>
              )}

              {confirmAction.status !== "done" && (
                <p className="text-sm text-gray-600">
                  {confirmAction.action === "archive"
                    ? "Buat arsip dari folder ini?"
                    : "Extract arsip ini di lokasi sekarang?"}
                </p>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={closeConfirm}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                  disabled={confirmAction.status === "loading"}
                >
                  {confirmAction.status === "done" ? "Tutup" : "Batal"}
                </button>
                {confirmAction.status !== "done" && (
                  <button
                    onClick={performConfirmedAction}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                    disabled={confirmAction.status === "loading"}
                  >
                    {confirmAction.status === "loading" ? "Memproses..." : "Lanjutkan"}
                  </button>
                )}
              </div>
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
