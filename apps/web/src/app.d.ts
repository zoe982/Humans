/// <reference types="@sveltejs/kit" />

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const __BUILD_TIMESTAMP__: string;

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
