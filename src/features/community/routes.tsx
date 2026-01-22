import type { RouteObject } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { CommunityPage } from "./pages/CommunityPage";
import { CommunityDeckDetailPage } from "./pages/CommunityDeckDetailPage";

export const communityRoutes: RouteObject[] = [
  {
    path: "/community",
    element: (
      <ProtectedRoute>
        <CommunityPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/community/deck/:deckId",
    element: (
      <ProtectedRoute>
        <CommunityDeckDetailPage />
      </ProtectedRoute>
    ),
  },
];
