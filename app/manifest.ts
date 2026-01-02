import type { MetadataRoute } from "next";

const appTitle = process.env.NEXT_PUBLIC_APP_NAME ?? "Planner App";
const appDescription =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? "Telegram Mini App Planner";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appTitle,
    short_name: appTitle,
    description: appDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#f2f2f7",
    theme_color: "#f2f2f7",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
