import { defineConfig } from "vite";

export default defineConfig({
    server: {
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
});
