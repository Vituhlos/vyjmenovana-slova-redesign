import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout, { RequireParent } from "./components/layout/AppLayout/AppLayout";
import ProfileSelect from "./pages/ProfileSelect/ProfileSelect";
import Quiz from "./pages/Quiz/Quiz";
import History from "./pages/History/History";
import Manage from "./pages/Manage/Manage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <ProfileSelect />,
  },
  {
    element: <AppLayout />,
    children: [
      {
        path: "/quiz",
        element: <Quiz />,
      },
      {
        path: "/history",
        element: <History />,
      },
    ],
  },
  {
    element: <RequireParent />,
    children: [
      {
        path: "/manage",
        element: <Manage />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export default router;
