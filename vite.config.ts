import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
    server: {
        port: 3000,

        proxy: {
            "/FinalForEach": {
                target: "https://raw.githubusercontent.com",
                changeOrigin: true,
                headers: {
                    Accept: "application/vnd.github.v3+json",
                },
            },
        },
    },
    build: {
        target: "esnext",
    },
    plugins: [solidPlugin(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@components": path.resolve(__dirname, "./src/components"),
        },
    },
});
