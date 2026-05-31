// js/keyring.js — Orchestrates building+publishing keyring events for masterkey and subkey
import { state, upsertKey, removeKey } from "./state.js";
import { buildPublicKeyring, buildPrivateKeyring } from "./events.js";
import { publish } from "./relays.js";
import { saveVault } from "./storage.js";

// In-memory password for re-saving the vault. Set after unlock.
let sessionPassword = null;

export function setSessionPassword(pw) {
  sessionPassword = pw;
}

export async function persistVault() {
  if (!sessionPassword) return;
  await saveVault({
    masterkey: state.masterkey,
    keyring: state.keyring,
  }, sessionPassword);
}

/**
 * Add a key entry to the local keyring and persist.
 */
export async function addKeyEntry(entry) {
  upsertKey(entry);
  await persistVault();
}

export async function removeKeyEntry(pubkey) {
  removeKey(pubkey);
  await persistVault();
}

/**
 * Publish the masterkey's kind 17991 event listing all known related keys.
 */
export async function publishMasterPublicKeyring() {
  const m = state.masterkey;
  if (!m || !m.seckey) throw new Error("Masterkey secret key required");
  const entries = state.keyring.map((k) => ({
    relation: k.relation, pubkey: k.pubkey, functions: k.functions,
  }));
  const evt = buildPublicKeyring(m.seckey, entries);
  return publish(evt, m.homeRelays);
}

/**
 * Publish the masterkey's kind 17992 (private) event with optional secret keys included.
 */
export async function publishMasterPrivateKeyring() {
  const m = state.masterkey;
  if (!m || !m.seckey) throw new Error("Masterkey secret key required");
  const payload = state.keyring.map((k) => ({
    relation: k.relation,
    name: k.name || "",
    description: k.description || "",
    pubkey: k.pubkey,
    seckey: k.seckey || null,
    function: k.functions || [],
  }));
  const evt = buildPrivateKeyring(m.seckey, m.pubkey, payload);
  return publish(evt, m.homeRelays);
}

/**
 * Build a kind 17991 event from the SUBKEY's perspective (subkey publishes the
 * relation back to its masterkey). Requires the subkey's secret key.
 */
export async function publishSubkeyKeyring(subkey) {
  if (!subkey.seckey) throw new Error("Subkey secret key required to publish from subkey");
  const m = state.masterkey;
  const entries = [{ relation: "M", pubkey: m.pubkey, functions: ["certify"] }];
  const evt = buildPublicKeyring(subkey.seckey, entries);
  return publish(evt, m.homeRelays);
}

/**
 * Build a kind 17992 (private) event from the SUBKEY's perspective, encrypted
 * to the subkey itself. Contains the masterkey reference (pubkey only — we
 * never store the masterkey seckey inside a subkey event).
 */
export async function publishSubkeyPrivateKeyring(subkey) {
  if (!subkey.seckey) throw new Error("Subkey secret key required to publish from subkey");
  const { getPublicKeyHex } = await import("./crypto.js");
  const subPub = getPublicKeyHex(subkey.seckey);
  const m = state.masterkey;
  const payload = [{
    relation: "M",
    name: "",
    description: "masterkey",
    pubkey: m.pubkey,
    seckey: null,
    function: ["certify"],
  }];
  const evt = buildPrivateKeyring(subkey.seckey, subPub, payload);
  return publish(evt, m.homeRelays);
}

/**
 * Logout: clear in-memory state. Does NOT delete the vault.
 */
export function lockSession() {
  sessionPassword = null;
}
