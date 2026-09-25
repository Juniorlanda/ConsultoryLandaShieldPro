import { getStore } from "@netlify/blobs";
import bcrypt from "bcryptjs";
import { getSession } from "../../lib/auth.mts";

export default async (req: Request) => {
  const session: any = await getSession(req);
  if (!session || session.role !== "admin") return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { clienteId, empresa, plan, telefono, email, user, password } = body;
  if (!clienteId || !empresa || !user) {
    return Response.json({ ok: false, error: "Faltan datos obligatorios (empresa, usuario)" }, { status: 400 });
  }

  const clientesStore = getStore("clientes");
  const creds = getStore("credenciales");
  const existing: any = await clientesStore.get(clienteId, { type: "json" });

  await clientesStore.setJSON(clienteId, {
    clienteId, empresa, plan: plan || "Corporativo",
    telefono: telefono || "", email: email || "", user,
  });

  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await creds.setJSON(`cliente:${user}`, { user, hash, clienteId, empresa });
  } else if (existing && existing.user !== user) {
    const oldCred: any = await creds.get(`cliente:${existing.user}`, { type: "json" });
    if (oldCred) {
      await creds.setJSON(`cliente:${user}`, { ...oldCred, user, empresa });
      await creds.delete(`cliente:${existing.user}`);
    }
  }

  return Response.json({ ok: true, updated: !!existing });
};

export const config = { path: "/api/clientes-admin" };
