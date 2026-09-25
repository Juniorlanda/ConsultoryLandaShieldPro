import { getStore } from "@netlify/blobs";
import { getSession } from "../../lib/auth.mts";

export default async (req: Request) => {
  const session: any = await getSession(req);
  if (!session) return Response.json({ ok: false }, { status: 401 });
  const clientesStore = getStore("clientes");
  const equiposStore = getStore("equipos");
  const { blobs: cb } = await clientesStore.list();
  let clientes: any[] = await Promise.all(cb.map((b) => clientesStore.get(b.key, { type: "json" })));
  const { blobs: eb } = await equiposStore.list();
  let equipos: any[] = await Promise.all(eb.map((b) => equiposStore.get(b.key, { type: "json" })));
  if (session.role !== "admin") {
    equipos = equipos.filter((e) => e.clienteId === session.clienteId);
    clientes = clientes.filter((c) => c.clienteId === session.clienteId);
  }
  return Response.json({ ok: true, clientes, equipos });
};

export const config = { path: "/api/meta" };
