/// <reference types="@sveltejs/kit" />

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
