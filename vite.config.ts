import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "OpenRecipeBook",
        short_name: "RecipeBook",
        description: "Open source recipe keeper and meal planner",
        theme_color: "#c25e3e",
        background_color: "#faf8f5",
        display: "standalone",
        share_target: {
          action: "./",
          method: "GET",
          params: {
            title: "title",
            text: "text",
            url: "url"
          }
        },
        file_handlers: [
          {
            action: "./",
            name: "Open Recipe",
            accept: {
              "application/json": [".recipe.json", ".jsonld"],
              "application/zip": [".openrecipebook.zip", ".paprikarecipes"]
            }
          }
        ],
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ]
});
