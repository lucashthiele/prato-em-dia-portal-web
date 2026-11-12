import { createBrowserRouter, Navigate } from "react-router";
import {
  ConsentPage,
  LoginPage,
  RedirectIfSession,
  RequireConsent,
  RequireSession,
} from "../features/auth";
import { HomePage } from "../features/home";
import { PatientPage, PatientsListPage } from "../features/patients";
import { ComingSoon } from "./ComingSoon";
import { Shell } from "./Shell";

export const routes = [
  {
    element: <RedirectIfSession />,
    children: [{ path: "/login", element: <LoginPage /> }],
  },
  {
    element: <RequireConsent />,
    children: [{ path: "/termos", element: <ConsentPage /> }],
  },
  {
    element: <RequireSession />,
    children: [
      {
        element: <Shell />,
        children: [
          { path: "/", element: <HomePage /> },
          { path: "/pacientes", element: <PatientsListPage /> },
          // Rotas reservadas até os tickets de cadastro, editor de prescrição e Perfil.
          { path: "/pacientes/novo", element: <ComingSoon title="Adicionar paciente" /> },
          { path: "/pacientes/:patientId", element: <PatientPage /> },
          {
            path: "/pacientes/:patientId/prescricao/nova",
            element: <ComingSoon title="Nova versão da prescrição" />,
          },
          { path: "/perfil", element: <ComingSoon title="Perfil e conta" /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
];

export const router = createBrowserRouter(routes);
