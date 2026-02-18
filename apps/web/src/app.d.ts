/// <reference types="@sveltejs/kit" />

declare global {
  namespace App {
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
