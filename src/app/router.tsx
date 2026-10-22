import { createBrowserRouter, Navigate } from "react-router";
import { LoginPage, RequireSession, RedirectIfSession } from "../features/auth";
import { HomePage } from "../features/home";
import { ComingSoon } from "./ComingSoon";
import { Shell } from "./Shell";

export const routes = [
  {
    element: <RedirectIfSession />,
    children: [{ path: "/login", element: <LoginPage /> }],
  },
  {
    element: <RequireSession />,
    children: [
      {
        element: <Shell />,
        children: [
          { path: "/", element: <HomePage /> },
          // Rotas reservadas até os tickets de Pacientes e Perfil.
          { path: "/pacientes/*", element: <ComingSoon title="Pacientes" /> },
          { path: "/perfil", element: <ComingSoon title="Perfil e conta" /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
];

export const router = createBrowserRouter(routes);
