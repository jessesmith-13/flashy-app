import type { RouteObject } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { CommunityPage } from "./pages/CommunityPage";

export const communityRoutes: RouteObject[] = [
  {
    path: "/community",
    element: (
      <ProtectedRoute>
        <CommunityPage />
      </ProtectedRoute>
    ),
  },
];
