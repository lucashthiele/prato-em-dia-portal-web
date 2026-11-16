import { createBrowserRouter, Navigate } from "react-router";
import {
  ConsentPage,
  LoginPage,
  RedirectIfSession,
  RequireConsent,
  RequirePasswordSetup,
  RequireRole,
  RequireSession,
} from "../features/auth";
import { ChangePasswordPage, ProfilePage, SetPasswordPage } from "../features/account";
import { HomePage } from "../features/home";
import { NewPatientPage, PatientPage, PatientsListPage } from "../features/patients";
import { ComingSoon } from "./ComingSoon";
import { Shell } from "./Shell";

export const routes = [
  {
    element: <RedirectIfSession />,
    children: [{ path: "/login", element: <LoginPage /> }],
  },
  {
    element: <RequirePasswordSetup />,
    children: [{ path: "/definir-senha", element: <SetPasswordPage /> }],
  },
  {
    element: <RequireConsent />,
    children: [{ path: "/termos", element: <ConsentPage /> }],
  },
  {
    element: <RequireSession />,
    children: [
      {
        // Área do nutricionista. Quem é admin é levado a /admin, sem tela de erro (Q3).
        element: <RequireRole allow="NUTRITIONIST" />,
        children: [
          {
            element: <Shell />,
            children: [
              { path: "/", element: <HomePage /> },
              { path: "/pacientes", element: <PatientsListPage /> },
              // Rota reservada até o editor de prescrição.
              { path: "/pacientes/novo", element: <NewPatientPage /> },
              { path: "/pacientes/:patientId", element: <PatientPage /> },
              { path: "/pacientes/:patientId/acompanhamento/:data", element: <PatientPage /> },
              {
                path: "/pacientes/:patientId/prescricao/nova",
                element: <ComingSoon title="Nova versão da prescrição" />,
              },
              { path: "/perfil", element: <ProfilePage /> },
              { path: "/perfil/senha", element: <ChangePasswordPage /> },
            ],
          },
        ],
      },
      {
        // Área do admin. Placeholder: o worker do admin troca pelo Shell e pelas telas dele.
        element: <RequireRole allow="ADMIN" />,
        children: [{ path: "/admin/*", element: <ComingSoon title="Administração" /> }],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
];

export const router = createBrowserRouter(routes);
