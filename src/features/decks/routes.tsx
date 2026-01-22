import type { RouteObject } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { DecksPage } from "./pages/DecksPage";
import { DeckDetailPage } from "./pages/DeckDetailPage";

export const decksRoutes: RouteObject[] = [
  {
    path: "/decks",
    element: (
      <ProtectedRoute>
        <DecksPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/deck-detail/:deckId",
    element: (
      <ProtectedRoute>
        <DeckDetailPage />
      </ProtectedRoute>
    ),
  },
];
