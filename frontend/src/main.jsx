
import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";

// ============================================
// POKEMON NEXUS - STYLES
// ============================================

// Pokedex e layout principal
import "./styles/global.css";

// Boosters e colecao
import "./styles/tcg.css";

// Deck Builder
import "./styles/deck.css";

// Battle Arena
import "./styles/battle.css";

// ============================================
// POKEMON NEXUS - REACT ENTRY POINT V1.5
// ============================================

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Elemento root não encontrado no index.html."
  );
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
