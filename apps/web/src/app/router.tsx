import { createBrowserRouter, type RouteObject } from "react-router";
import { AppLayout } from "./AppLayout";
import { UploadPage } from "../pages/UploadPage";
import { ReviewPage } from "../pages/ReviewPage";
import { JobDescriptionPage } from "../pages/JobDescriptionPage";
import { ResultPage } from "../pages/ResultPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RequireSession } from "./RequireSession";

// Flow: / (upload) → /review → /job → /result   (Tech Design §6.4)
// Guards send users back to the first step whose data is missing (RequireSession).
// Exported separately so tests can mount the same routes in a memory router.
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <UploadPage /> },
      {
        path: "/review",
        element: (
          <RequireSession need="resume">
            <ReviewPage />
          </RequireSession>
        ),
      },
      {
        path: "/job",
        element: (
          <RequireSession need="resume">
            <JobDescriptionPage />
          </RequireSession>
        ),
      },
      {
        path: "/result",
        element: (
          <RequireSession need="result">
            <ResultPage />
          </RequireSession>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
