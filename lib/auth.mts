import { getStore } from "@netlify/blobs";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000; // 15 minutos

export async function getSession(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return null;
  const sessions = getStore("sesiones");
  const sess: any = await sessions.get(token, { type: "json" });
  if (!sess) return null;
  if (Date.now() - sess.createdAt > SESSION_TTL_MS) {
    await sessions.delete(token);
    return null;
  }
  return sess;
}

export async function checkLockout(key: string) {
  const store = getStore("intentos");
  const rec: any = await store.get(key, { type: "json" });
  if (!rec) return { locked: false };
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
    return { locked: true, minutesLeft: Math.ceil((rec.lockedUntil - Date.now()) / 60000) };
  }
  return { locked: false };
}

export async function registerFailedAttempt(key: string) {
  const store = getStore("intentos");
  const rec: any = (await store.get(key, { type: "json" })) || { count: 0 };
  rec.count = (rec.count || 0) + 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCK_MS;
    rec.count = 0;
  }
  await store.setJSON(key, rec);
}

export async function clearAttempts(key: string) {
  const store = getStore("intentos");
  await store.delete(key);
}
