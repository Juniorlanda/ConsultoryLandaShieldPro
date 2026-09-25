import { getStore } from "@netlify/blobs";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { role, user, password } = await req.json();
  const creds = getStore("credenciales");
  const key = role === "admin" ? "admin" : `cliente:${user}`;
  const rec: any = await creds.get(key, { type: "json" });
  if (!rec || (role !== "admin" && rec.user !== user)) {
    return Response.json({ ok: false, error: "Credenciales inválidas" }, { status: 401 });
  }
  const match = await bcrypt.compare(password || "", rec.hash);
  if (!match) return Response.json({ ok: false, error: "Credenciales inválidas" }, { status: 401 });

  const token = randomUUID();
  const sessions = getStore("sesiones");
  await sessions.setJSON(token, { role, clienteId: rec.clienteId || null, createdAt: Date.now() });

  return Response.json({ ok: true, token, role, clienteId: rec.clienteId || null, empresa: rec.empresa || null });
};

export const config = { path: "/api/login" };
