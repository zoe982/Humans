import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = () => {
  // __BUILD_TIMESTAMP__ is injected at build time via vite.config.ts define
  const v: string = __BUILD_TIMESTAMP__;
  return json({
    name: "Humans CRM",
    short_name: "Humans",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#e8eaed",
    theme_color: "#0a0a0f",
    icons: [
      { src: `/icon-192x192.png?v=${v}`, sizes: "192x192", type: "image/png" },
      { src: `/icon-512x512.png?v=${v}`, sizes: "512x512", type: "image/png" },
    ],
  }, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
};
