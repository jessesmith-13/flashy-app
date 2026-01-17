import type { RouteObject } from "react-router-dom";
import { AllCardsPage } from "./AllCardsPage";

export const allCardsRoutes: RouteObject[] = [
  { path: "/all-cards", element: <AllCardsPage /> },
];
