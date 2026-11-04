import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { ApiError } from "./api/cliente";
import { RutaProtegida } from "./auth/RutaProtegida";
import "./index.css";
import AppLayout from "./layouts/AppLayout";
import AdminLayout from "./pages/admin/AdminLayout";
import LoginAdmin from "./pages/admin/LoginAdmin";
import AdminMaterias from "./pages/admin/Materias";
import AdminOferta from "./pages/admin/Oferta";
import Calificaciones from "./pages/Calificaciones";
import Dashboard from "./pages/Dashboard";
import Horario from "./pages/Horario";
import Kardex from "./pages/Kardex";
import Login from "./pages/Login";
import Avance from "./pages/planificador/Avance";
import Generador from "./pages/planificador/Generador";
import Mapa from "./pages/planificador/Mapa";
import PlanificadorLayout from "./pages/planificador/PlanificadorLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // No reintentar errores de sesión o de credenciales; sí reintentar 1 vez fallas de red/SII
      retry: (n, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && n < 1,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <RutaProtegida />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: "calificaciones", element: <Calificaciones /> },
          { path: "kardex", element: <Kardex /> },
          { path: "horario", element: <Horario /> },
          {
            path: "planificador",
            element: <PlanificadorLayout />,
            children: [
              { index: true, element: <Avance /> },
              { path: "mapa", element: <Mapa /> },
              { path: "generador", element: <Generador /> },
            ],
          },
        ],
      },
    ],
  },
  { path: "/admin/login", element: <LoginAdmin /> },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminMaterias /> },
      { path: "oferta", element: <AdminOferta /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
