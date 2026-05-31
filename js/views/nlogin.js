// js/views/nlogin.js — Tabbed view: Import / Export nlogin
import { renderImport, leaveImport } from "./import.js";
import { renderExport } from "./export.js";

let currentTab = "import";

export async function renderNlogin() {
  const content = document.getElementById("nloginContent");
  const tabs = document.getElementById("nloginTabs");

  // Wire tab clicks
  tabs.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      // Stop scanner when switching away from import
      if (currentTab === "import" && btn.dataset.tab !== "import") {
        await leaveImport();
      }
      currentTab = btn.dataset.tab;
      tabs.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderTab(content);
    });
  });

  // Highlight the correct tab
  tabs.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === currentTab);
  });

  renderTab(content);
}

function renderTab(content) {
  if (currentTab === "import") {
    content.innerHTML = `
      <div class="split">
        <div class="card import-card" id="importPanel"></div>
        <div class="card scan-card" id="scanPanel"></div>
      </div>`;
    renderImport();
  } else {
    content.innerHTML = `<div class="card" id="exportCard" style="max-width:580px;"></div>`;
    renderExport();
  }
}

export async function leaveNlogin() {
  await leaveImport();
}
