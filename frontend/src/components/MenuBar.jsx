import { FaHome } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

export default function MenuBar({ title }) {
    const navigate = useNavigate();
    const location = useLocation();
    return (
        <div className="flex items-center gap-3 mb-6 fixed p-4 w-full top-0 left-0 z-50 bg-white shadow">
            <button
                onClick={() => location.pathname === '/' ? undefined : navigate("/")}
                className="text-blue-600 hover:text-blue-800 transition flex items-center gap-2 transform transition duration-200 hover:scale-125"
            >
                <img
                    src="/logo.png"
                    alt="logo"
                    className="w-8 opacity-90"
                />
            </button>

            <h1 className="text-2xl font-bold">{title}</h1>
        </div>
    )
}