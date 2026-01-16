/**
 * Environment configuration utilities
 */

// Beta Testing Feature Flag
export const IS_BETA_TESTING_ENABLED =
  import.meta.env.VITE_ENABLE_BETA_TESTING === "true";

// You can add other environment-based config here in the future:
// export const IS_PRODUCTION = import.meta.env.PROD
// export const API_URL = import.meta.env.VITE_API_URL
// etc.
