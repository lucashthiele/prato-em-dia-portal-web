import { createBrowserRouter, Navigate, useParams } from "react-router";
import {
  ConsentPage,
  LoginPage,
  RedirectIfSession,
  RequireConsent,
  RequireSession,
} from "../features/auth";
import { HomePage } from "../features/home";
import { PatientContextHeader, PatientPage, PatientsListPage } from "../features/patients";
import { PrescriptionEditorPage } from "../features/prescriptions";
import { ComingSoon } from "./ComingSoon";
import { Shell } from "./Shell";

function PrescriptionEditorRoute() {
  const { patientId = "" } = useParams();
  return <PrescriptionEditorPage header={<PatientContextHeader patientId={patientId} />} />;
}

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
          // Rotas reservadas até os tickets de cadastro e Perfil.
          { path: "/pacientes/novo", element: <ComingSoon title="Adicionar paciente" /> },
          { path: "/pacientes/:patientId", element: <PatientPage /> },
          // O editor sempre edita um rascunho existente (Q9): a criação da prescrição e da versão
          // acontece antes, na aba Prescrição.
          {
            path: "/pacientes/:patientId/prescricao/:versionId",
            element: <PrescriptionEditorRoute />,
          },
          { path: "/perfil", element: <ComingSoon title="Perfil e conta" /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
];

export const router = createBrowserRouter(routes);
