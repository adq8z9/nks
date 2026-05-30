// js/main.js — App boot
import { state, setState, subscribe } from "./state.js";
import { getThemePref } from "./storage.js";
import { applyView, wireTopNav } from "./router.js";
import { toggleTheme } from "./ui-utils.js";
import { lockSession } from "./keyring.js";

function init() {
  // Theme
  const theme = getThemePref();
  document.documentElement.setAttribute("data-theme", theme);
  state.theme = theme;

  // Default view depends on whether a vault exists
  if (!state.masterkey) state.view = "login";

  // Wire global UI
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("logoutBtn").addEventListener("click", () => {
    lockSession();
    // Clear in-memory state but keep encrypted vault on disk
    setState({ masterkey: null, keyring: [], view: "login" });
  });
  wireTopNav();

  // Re-render on state changes
  subscribe(() => { applyView(); });

  // First render
  applyView();
}

// Boot when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
