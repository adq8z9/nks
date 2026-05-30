// js/sync.js — Fetch existing keyring events from relays
import { fetchLatest } from "./relays.js";
import { decryptPrivateKeyring, KIND_PUBLIC, KIND_PRIVATE } from "./events.js";

/**
 * Attempt to fetch an existing keyring from relays.
 * Tries kind 17992 (private, includes seckeys) first,
 * falls back to kind 17991 (public, pubkeys only).
 * Returns an array of key entries (may be empty).
 */
export async function fetchExistingKeyring(masterkey) {
  const { pubkey, seckey, homeRelays } = masterkey;
  if (!homeRelays || homeRelays.length === 0) return [];

  // Try private keyring first — it carries secret keys
  const priv = await fetchPrivateKeyring(homeRelays, pubkey, seckey);
  if (priv && priv.length > 0) return priv;

  // Fall back to public keyring — pubkeys only
  const pub = await fetchPublicKeyring(homeRelays, pubkey);
  return pub || [];
}

async function fetchPrivateKeyring(relays, pubkey, seckey) {
  try {
    const event = await fetchLatest(relays, {
      kinds: [KIND_PRIVATE],
      authors: [pubkey],
      limit: 1,
    });
    if (!event) return null;
    const payload = decryptPrivateKeyring(event, seckey, pubkey);
    if (!Array.isArray(payload)) return null;
    return payload.map(normalizePrivateEntry);
  } catch (e) {
    console.warn("Failed to fetch/decrypt private keyring:", e);
    return null;
  }
}

async function fetchPublicKeyring(relays, pubkey) {
  try {
    const event = await fetchLatest(relays, {
      kinds: [KIND_PUBLIC],
      authors: [pubkey],
      limit: 1,
    });
    if (!event) return null;
    return event.tags
      .filter((t) => ["S", "O", "M"].includes(t[0]) && t[1])
      .map(normalizePublicTag);
  } catch (e) {
    console.warn("Failed to fetch public keyring:", e);
    return null;
  }
}

function normalizePrivateEntry(e) {
  return {
    relation: e.relation || "O",
    pubkey: e.pubkey,
    seckey: e.seckey || null,
    name: e.name || "",
    description: e.description || "",
    functions: e.function || e.functions || [],
  };
}

function normalizePublicTag(tag) {
  const fns = tag[2] ? tag[2].split(",").map((s) => s.trim()).filter(Boolean) : [];
  return {
    relation: tag[0],
    pubkey: tag[1],
    seckey: null,
    name: "",
    description: "",
    functions: fns,
  };
}
