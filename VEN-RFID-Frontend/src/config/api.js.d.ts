// TypeScript declaration for api.js config
// Adjust types as needed for your API_CONFIG shape

declare module '../config/api.js' {
  export const API_CONFIG: {
    BASE_URL: string;
    [key: string]: any;
  };
}
