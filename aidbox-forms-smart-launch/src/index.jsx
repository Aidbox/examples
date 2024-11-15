import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { Dashboard } from "@/pages/dashboard.jsx";
import { Page } from "@/components/page.jsx";
import { Questionnaires } from "@/pages/questionnaires.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuestionnaireEditor } from "@/pages/questionnaire-editor.jsx";
import { Toaster } from "@/ui/toaster";
import { Error } from "@/pages/error.jsx";
import { Loading } from "@/components/loading.jsx";
import { QuestionnaireResponse } from "@/pages/questionnaire-response.jsx";
import { QuestionnaireResponses } from "@/pages/questionnaire-responses.jsx";
import { PractitionerOnly } from "@/components/practitioner-only.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      throwOnError: true,
    },
  },
});

const router = createHashRouter([
  {
    path: "/",
    Component: Page,
    ErrorBoundary: Error,
    children: [
      {
        index: true,
        Component: Dashboard,
      },
      {
        path: "/questionnaire-responses",
        Component: QuestionnaireResponses,
      },
      {
        path: "/questionnaire-responses/:id",
        Component: QuestionnaireResponse,
      },
      {
        Component: PractitionerOnly,
        children: [
          {
            path: "/questionnaires",
            Component: Questionnaires,
          },
          {
            path: "/questionnaires/:id",
            Component: QuestionnaireEditor,
          },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<Loading />}>
        <RouterProvider router={router} />
      </Suspense>
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);
