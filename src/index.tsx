/* @refresh reload */
import { render } from "solid-js/web";

import "./index.css";
import App from "./App";
import { type RouteDefinition, Router } from "@solidjs/router";

const root = document.getElementById("root");
const rootNotFound = "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?";

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
    throw new Error(rootNotFound);
}

const routes: RouteDefinition[] = [
    {
        path: "/",
        component: App,
    },
];

if (root) render(() => <Router>{routes}</Router>, root);
else console.error(rootNotFound);
