// js/events.js — Build & sign kind 17991 / 17992 keyring events
import { finalizeEvent, getEventHash } from "https://esm.sh/nostr-tools@2.7.2/pure";
import { nip44 } from "https://esm.sh/nostr-tools@2.7.2";
import { hexToBytes } from "./crypto.js";

const KIND_PUBLIC = 17991;
const KIND_PRIVATE = 17992;

export { KIND_PUBLIC, KIND_PRIVATE };

/**
 * Build a kind 17991 (public keyring) event.
 * keyring entries: [{ relation: "S"|"O"|"M", pubkey, functions[] }, ...]
 */
export function buildPublicKeyring(publisherSecHex, entries) {
  const tags = entries.map((e) => {
    const desc = (e.functions && e.functions.length) ? e.functions.join(",") : "";
    const tag = [e.relation, e.pubkey];
    if (desc) tag.push(desc);
    return tag;
  });
  const evt = {
    kind: KIND_PUBLIC,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: "",
  };
  return finalizeEvent(evt, hexToBytes(publisherSecHex));
}

/**
 * Build a kind 17992 (private keyring) event, encrypted to self via NIP-44 v2.
 * payload: array of { relation, name, description, pubkey, seckey?, function[] }
 */
export function buildPrivateKeyring(publisherSecHex, publisherPubHex, payload) {
  const secBytes = hexToBytes(publisherSecHex);
  const conv = nip44.v2.utils.getConversationKey(secBytes, publisherPubHex);
  const cipher = nip44.v2.encrypt(JSON.stringify(payload), conv);
  const evt = {
    kind: KIND_PRIVATE,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["encryption", "nip44_v2"]],
    content: cipher,
  };
  return finalizeEvent(evt, secBytes);
}

/**
 * Decrypt the content of a kind 17992 event for a given reader.
 */
export function decryptPrivateKeyring(event, readerSecHex, counterpartyPubHex) {
  const secBytes = hexToBytes(readerSecHex);
  const conv = nip44.v2.utils.getConversationKey(secBytes, counterpartyPubHex);
  const json = nip44.v2.decrypt(event.content, conv);
  return JSON.parse(json);
}

export function eventId(evt) {
  return getEventHash(evt);
}
