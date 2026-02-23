import { json } from "@sveltejs/kit";

const v = __BUILD_TIMESTAMP__;

export function GET() {
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
}
