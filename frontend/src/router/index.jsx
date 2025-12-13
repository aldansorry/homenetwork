import { BrowserRouter, Routes } from "react-router-dom";

// ambil semua file route selain index.jsx
const modules = import.meta.glob("./*.jsx", { eager: true });

// kumpulkan semua export bernama "*Routes"
let collectedRoutes = [];

for (const path in modules) {
  const mod = modules[path];

  Object.keys(mod).forEach((key) => {
    if (key.endsWith("Routes")) {
      collectedRoutes.push(mod[key]);
    }
  });
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {collectedRoutes}
      </Routes>
    </BrowserRouter>
  );
}
