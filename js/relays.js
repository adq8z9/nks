// js/relays.js — Simple relay client for publishing keyring events
import { SimplePool } from "https://esm.sh/nostr-tools@2.7.2/pool";
import { useWebSocketImplementation } from "https://esm.sh/nostr-tools@2.7.2/pool";

// Browser already has WebSocket; just ensure the lib uses it.
try { useWebSocketImplementation(WebSocket); } catch {}

let pool = null;
function getPool() {
  if (!pool) pool = new SimplePool();
  return pool;
}

export function disposePool() {
  if (pool) {
    try { pool.close([]); } catch {}
    pool = null;
  }
}

/**
 * Publish a signed event to a set of relays. Resolves with a per-relay result.
 */
export async function publish(event, relays) {
  if (!relays || relays.length === 0) {
    return [{ relay: null, ok: false, error: "No relays configured" }];
  }
  const p = getPool();
  const results = await Promise.allSettled(p.publish(relays, event));
  return results.map((r, i) => ({
    relay: relays[i],
    ok: r.status === "fulfilled",
    error: r.status === "rejected" ? String(r.reason) : null,
  }));
}

/**
 * Fetch the latest kind-17991 (or other) event for an author from relays.
 */
export async function fetchLatest(relays, filter) {
  if (!relays || relays.length === 0) return null;
  const p = getPool();
  return new Promise((resolve) => {
    let latest = null;
    let timeout;
    const sub = p.subscribeMany(relays, [filter], {
      onevent(ev) {
        if (!latest || ev.created_at > latest.created_at) latest = ev;
      },
      oneose() {
        clearTimeout(timeout);
        try { sub.close(); } catch {}
        resolve(latest);
      },
    });
    timeout = setTimeout(() => {
      try { sub.close(); } catch {}
      resolve(latest);
    }, 6000);
  });
}

export function normalizeRelayUrl(url) {
  const u = url.trim();
  if (!u) return null;
  if (!/^wss?:\/\//i.test(u)) return `wss://${u}`;
  return u;
}
