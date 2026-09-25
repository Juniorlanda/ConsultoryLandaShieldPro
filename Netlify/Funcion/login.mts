import { getStore } from "@netlify/blobs";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { checkLockout, registerFailedAttempt, clearAttempts } from "../../lib/auth.mts";

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { role, user, password } = await req.json();
  const lockKey = `${role}:${user}`;

  const lock = await checkLockout(lockKey);
  if (lock.locked) {
    return Response.json({ ok: false, error: `Demasiados intentos. Espera ${lock.minutesLeft} min.` }, { status: 429 });
  }

  const creds = getStore("credenciales");
  const key = role === "admin" ? "admin" : `cliente:${user}`;
  const rec: any = await creds.get(key, { type: "json" });
  if (!rec || (role !== "admin" && rec.user !== user)) {
    await registerFailedAttempt(lockKey);
    return Response.json({ ok: false, error: "Credenciales inválidas" }, { status: 401 });
  }
  const match = await bcrypt.compare(password || "", rec.hash);
  if (!match) {
    await registerFailedAttempt(lockKey);
    return Response.json({ ok: false, error: "Credenciales inválidas" }, { status: 401 });
  }
  await clearAttempts(lockKey);

  const token = randomUUID();
  const sessions = getStore("sesiones");
  await sessions.setJSON(token, { role, clienteId: rec.clienteId || null, createdAt: Date.now() });

  return Response.json({ ok: true, token, role, clienteId: rec.clienteId || null, empresa: rec.empresa || null });
};

export const config = { path: "/api/login" };
