import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";

const rootEl = document.getElementById("root");

if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}
