import { getStore } from "@netlify/blobs";
import bcrypt from "bcryptjs";

const CLIENTES = [
  { clienteId: "textiles-andina", user: "textiles-andina", pass: "ta2026", empresa: "Textiles Andina SAC", plan: "Corporativo", telefono: "51999111222", email: "contacto@textilesandina.pe" },
  { clienteId: "grupo-velmar", user: "grupo-velmar", pass: "gv2026", empresa: "Grupo Velmar", plan: "Preventivo", telefono: "51999333444", email: "contacto@grupovelmar.pe" },
  { clienteId: "dominus", user: "dominus", pass: "dm2026", empresa: "Consultora Dominus", plan: "Seguridad", telefono: "51999555666", email: "contacto@dominus.pe" }
];
const EQUIPOS = [
  { id: "srv-01", serie: "SRV-01", modelo: "Dell PowerEdge R440", resp: "Torres, Ana", estado: "ok", clienteId: "textiles-andina" },
  { id: "srv-02", serie: "SRV-02", modelo: "HP ProLiant DL380", resp: "Ramírez, Luis", estado: "warn", clienteId: "textiles-andina" },
  { id: "wks-14", serie: "WKS-14", modelo: "Lenovo ThinkCentre M70", resp: "Salas, Carla", estado: "ok", clienteId: "grupo-velmar" }
];
const TICKETS = [
  { id: "LS-0231", svc: "Soporte Correctivo", clienteId: "textiles-andina", status: "proc", desc: "Falla en servidor SRV-02, no responde a ping." },
  { id: "LS-0230", svc: "Mantenimiento Preventivo", clienteId: "grupo-velmar", status: "ok", desc: "Limpieza y actualización de estaciones de trabajo." },
  { id: "LS-0229", svc: "Seguridad y Respaldo", clienteId: "dominus", status: "pend", desc: "Configurar respaldo automático en la nube." }
];

export default async (req: Request) => {
  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== Netlify.env.get("SEED_SECRET")) {
    return new Response("No autorizado", { status: 401 });
  }
  const creds = getStore("credenciales");
  const clientesStore = getStore("clientes");
  const equiposStore = getStore("equipos");
  const ticketsStore = getStore("tickets");

  for (const c of CLIENTES) {
    const hash = await bcrypt.hash(c.pass, 10);
    await creds.setJSON(`cliente:${c.user}`, { user: c.user, hash, clienteId: c.clienteId, empresa: c.empresa });
    await clientesStore.setJSON(c.clienteId, { clienteId: c.clienteId, empresa: c.empresa, plan: c.plan, telefono: c.telefono, email: c.email, user: c.user });
  }
  const adminHash = await bcrypt.hash(Netlify.env.get("ADMIN_PASSWORD") || "landshield2026", 10);
  await creds.setJSON("admin", { user: "admin", hash: adminHash });

  for (const e of EQUIPOS) await equiposStore.setJSON(e.id, e);
  for (const t of TICKETS) await ticketsStore.setJSON(t.id, t);

  return Response.json({ ok: true, seeded: { clientes: CLIENTES.length, equipos: EQUIPOS.length, tickets: TICKETS.length } });
};

export const config = { path: "/api/seed" };
