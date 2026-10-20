import { createBrowserRouter, Navigate } from "react-router";
import { ConnectedPage, LoginPage, RequireSession, RedirectIfSession } from "../features/auth";

export const routes = [
  {
    element: <RedirectIfSession />,
    children: [{ path: "/login", element: <LoginPage /> }],
  },
  {
    element: <RequireSession />,
    children: [{ path: "/", element: <ConnectedPage /> }],
  },
  { path: "*", element: <Navigate to="/" replace /> },
];

export const router = createBrowserRouter(routes);
