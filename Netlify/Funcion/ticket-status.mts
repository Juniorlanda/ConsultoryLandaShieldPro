import { getStore } from "@netlify/blobs";
import { getSession } from "../../lib/auth.mts";

export default async (req: Request) => {
  const session: any = await getSession(req);
  if (!session || session.role !== "admin") return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  const { id, status } = await req.json();
  const store = getStore("tickets");
  const ticket: any = await store.get(id, { type: "json" });
  if (!ticket) return Response.json({ ok: false, error: "Ticket no encontrado" }, { status: 404 });
  ticket.status = status;
  await store.setJSON(id, ticket);

  const clientesStore = getStore("clientes");
  const cliente: any = await clientesStore.get(ticket.clienteId, { type: "json" });
  const notified = { email: false, whatsapp: false };
  let manual: any = { wa: null, mail: null };

  if (cliente) {
    const statusText = status === "pend" ? "Pendiente" : status === "proc" ? "En proceso" : "Resuelto";
    const msg = `Hola ${cliente.empresa}, tu ticket ${ticket.id} (${ticket.svc}) cambió de estado a: ${statusText}. — LandShield Pro`;

    const sgKey = Netlify.env.get("SENDGRID_API_KEY");
    const sgFrom = Netlify.env.get("SENDGRID_FROM");
    if (sgKey && sgFrom && cliente.email) {
      try {
        const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { Authorization: `Bearer ${sgKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: cliente.email }] }],
            from: { email: sgFrom, name: "LandShield Pro" },
            subject: `Actualización de tu ticket ${ticket.id}`,
            content: [{ type: "text/plain", value: msg }],
          }),
        });
        notified.email = r.ok;
      } catch {}
    }

    const waToken = Netlify.env.get("WHATSAPP_TOKEN");
    const waPhoneId = Netlify.env.get("WHATSAPP_PHONE_ID");
    if (waToken && waPhoneId && cliente.telefono) {
      try {
        const r = await fetch(`https://graph.facebook.com/v20.0/${waPhoneId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: cliente.telefono, type: "text", text: { body: msg } }),
        });
        notified.whatsapp = r.ok;
      } catch {}
    }
    if (!notified.email && cliente.email) manual.mail = `mailto:${cliente.email}?subject=${encodeURIComponent("Actualización de tu ticket " + ticket.id)}&body=${encodeURIComponent(msg)}`;
    if (!notified.whatsapp && cliente.telefono) manual.wa = `https://wa.me/${cliente.telefono}?text=${encodeURIComponent(msg)}`;
  }

  return Response.json({ ok: true, ticket, notified, manual });
};

export const config = { path: "/api/ticket-status" };
