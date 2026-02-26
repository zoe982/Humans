/// <reference types="@sveltejs/kit" />

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const __BUILD_TIMESTAMP__: string;

// Declare public env vars so svelte-check works without a .env file
declare module '$env/static/public' {
  export const PUBLIC_API_URL: string;
}

declare global {
  namespace App {
    interface Error {
      code?: string;
      requestId?: string;
    }
    interface Locals {
      user: {
        id: string;
        email: string;
        name: string;
        avatarUrl: string | null;
        role: string;
      } | null;
    }
    interface Platform {
      env?: {
        API_URL: string;
      };
    }
  }
}

export {};
