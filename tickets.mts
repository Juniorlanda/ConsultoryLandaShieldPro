import { getStore } from "@netlify/blobs";
import { getSession } from "../../lib/auth.mts";

export default async (req: Request) => {
  const session: any = await getSession(req);
  if (!session) return Response.json({ ok: false, error: "No autenticado" }, { status: 401 });
  const store = getStore("tickets");

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const all: any[] = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
    const filtered = session.role === "admin" ? all : all.filter((t) => t.clienteId === session.clienteId);
    filtered.sort((a, b) => (a.id < b.id ? 1 : -1));
    return Response.json({ ok: true, tickets: filtered });
  }

  if (req.method === "POST") {
    const body = await req.json();
    const id = "LS-" + Math.floor(1000 + Math.random() * 8999);
    const clienteId = session.role === "admin" ? body.clienteId : session.clienteId;
    const ticket = { id, svc: body.svc, desc: body.desc, status: "pend", clienteId };
    await store.setJSON(id, ticket);
    return Response.json({ ok: true, ticket });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/tickets" };
