import type { RouteObject } from "react-router-dom";
import { ContactPage } from "./ContactPage";

export const contactRoutes: RouteObject[] = [
  { path: "/contact", element: <ContactPage /> },
];
