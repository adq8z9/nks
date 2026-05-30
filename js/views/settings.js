// js/views/settings.js — Manage relays, change password, wipe vault
import { state, setState } from "../state.js";
import { saveVault, hasVault } from "../storage.js";
import { setSessionPassword, lockSession, persistVault } from "../keyring.js";
import { normalizeRelayUrl } from "../relays.js";
import { toast, escapeHtml, modal } from "../ui-utils.js";

export function renderSettings() {
  const root = document.getElementById("settingsCard");
  root.innerHTML = `
    <div class="settings-section">
      <h4>Home relays</h4>
      <p>These relays receive your kind 17991 / 17992 events. The set is also embedded in every nlogin you share.</p>
      <div id="relaySettingsList">
        ${state.masterkey.homeRelays.map(relayRow).join("")}
      </div>
      <div style="display:flex; gap:var(--space-2); margin-top:var(--space-3);">
        <button class="relay-add" id="relayAdd" type="button">+ add relay</button>
        <button class="btn-primary" id="saveRelaysBtn" style="margin-left:auto;">Save relays</button>
      </div>
    </div>
    <div class="settings-section">
      <h4>Vault password</h4>
      <p>Re-encrypts the local vault with a new password. You'll need it to unlock the app next time.</p>
      <div class="field"><input id="newPw" class="input" type="password" placeholder="New password" /></div>
      <button class="btn-secondary" id="changePwBtn">Change password</button>
    </div>
    <div class="settings-section">
      <h4>Danger zone</h4>
      <p>Erases the local vault. Any keys published to relays remain on those relays.</p>
      <button class="btn-danger" id="wipeBtn">Wipe local vault</button>
    </div>`;
  wireRelays(root);
  root.querySelector("#saveRelaysBtn").addEventListener("click", () => onSaveRelays(root));
  root.querySelector("#changePwBtn").addEventListener("click", () => onChangePw(root));
  root.querySelector("#wipeBtn").addEventListener("click", onWipe);
}

function relayRow(value = "") {
  return `<div class="relay-row">
      <input class="input" value="${escapeHtml(value)}" placeholder="wss://relay.example.com" />
      <button class="relay-remove" type="button" title="Remove">×</button>
    </div>`;
}

function wireRelays(root) {
  root.querySelector("#relaySettingsList").addEventListener("click", (e) => {
    if (e.target.classList.contains("relay-remove")) e.target.closest(".relay-row").remove();
  });
  root.querySelector("#relayAdd").addEventListener("click", () => {
    root.querySelector("#relaySettingsList").insertAdjacentHTML("beforeend", relayRow());
  });
}

async function onSaveRelays(root) {
  const relays = [...root.querySelectorAll("#relaySettingsList .input")]
    .map((i) => normalizeRelayUrl(i.value)).filter(Boolean);
  if (relays.length === 0) { toast("Keep at least one relay", "error"); return; }
  state.masterkey = { ...state.masterkey, homeRelays: relays };
  await persistVault();
  setState({ masterkey: state.masterkey });
  toast("Home relays saved", "success");
}

async function onChangePw(root) {
  const pw = root.querySelector("#newPw").value;
  if (!pw || pw.length < 4) { toast("Choose a stronger password", "error"); return; }
  await saveVault({ masterkey: state.masterkey, keyring: state.keyring }, pw);
  setSessionPassword(pw);
  root.querySelector("#newPw").value = "";
  toast("Vault re-encrypted", "success");
}

async function onWipe() {
  const ok = await modal({
    title: "Wipe local vault?",
    body: `<p>This deletes your encrypted local vault. Anything published to relays remains there, but you'll lose your private keys unless you have a backup.</p>`,
    confirmText: "Wipe everything", confirmKind: "danger",
  });
  if (!ok) return;
  localStorage.clear();
  lockSession();
  toast("Vault wiped", "info");
  setTimeout(() => location.reload(), 800);
}
