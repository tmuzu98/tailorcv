import { createBrowserRouter } from "react-router";
import { AppLayout } from "./AppLayout";
import { UploadPage } from "../pages/UploadPage";
import { ReviewPage } from "../pages/ReviewPage";
import { JobDescriptionPage } from "../pages/JobDescriptionPage";
import { ResultPage } from "../pages/ResultPage";
import { NotFoundPage } from "../pages/NotFoundPage";

// Flow: / (upload) → /review → /job → /result   (Tech Design §6.4)
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <UploadPage /> },
      { path: "/review", element: <ReviewPage /> },
      { path: "/job", element: <JobDescriptionPage /> },
      { path: "/result", element: <ResultPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
