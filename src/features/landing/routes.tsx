// src/features/landing/routes.tsx
import type { RouteObject } from "react-router-dom";
import { LandingPage } from "./LandingPage";

export const landingRoutes: RouteObject[] = [
  {
    path: "/",
    element: <LandingPage />,
  },
];
