import { createBrowserRouter, Navigate, useParams } from "react-router";
import {
  ConsentPage,
  LoginPage,
  RedirectIfSession,
  RequireConsent,
  RequirePasswordSetup,
  RequireRole,
  RequireSession,
} from "../features/auth";
import {
  AdminProfilePage,
  ChangePasswordPage,
  ProfilePage,
  SetPasswordPage,
} from "../features/account";
import {
  AdminShell,
  AuditPage,
  CreateNutritionistPage,
  UserDetailPage,
  UsersListPage,
} from "../features/admin";
import { HomePage } from "../features/home";
import {
  NewPatientPage,
  PatientContextHeader,
  PatientPage,
  PatientsListPage,
} from "../features/patients";
import { PrescriptionEditorPage } from "../features/prescriptions";
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
              { path: "/pacientes/novo", element: <NewPatientPage /> },
              { path: "/pacientes/:patientId", element: <PatientPage /> },
              { path: "/pacientes/:patientId/acompanhamento/:data", element: <PatientPage /> },
              // O editor sempre edita um rascunho existente (Q9): a criação da prescrição e da
              // versão acontece antes, na aba Prescrição.
              {
                path: "/pacientes/:patientId/prescricao/:versionId",
                element: <PrescriptionEditorRoute />,
              },
              { path: "/perfil", element: <ProfilePage /> },
              { path: "/perfil/senha", element: <ChangePasswordPage /> },
            ],
          },
        ],
      },
      {
        // Área do admin (Q3, Q24), com Shell e SideNav próprios.
        element: <RequireRole allow="ADMIN" />,
        children: [
          {
            element: <AdminShell />,
            children: [
              { path: "/admin", element: <Navigate to="/admin/usuarios" replace /> },
              { path: "/admin/usuarios", element: <UsersListPage /> },
              { path: "/admin/usuarios/novo", element: <CreateNutritionistPage /> },
              { path: "/admin/usuarios/:id", element: <UserDetailPage /> },
              { path: "/admin/auditoria", element: <AuditPage /> },
              {
                path: "/admin/perfil",
                element: <AdminProfilePage changePasswordPath="/admin/perfil/senha" />,
              },
              {
                path: "/admin/perfil/senha",
                element: <ChangePasswordPage backTo="/admin/perfil" />,
              },
            ],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
];

export const router = createBrowserRouter(routes);
