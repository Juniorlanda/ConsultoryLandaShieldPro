import { getStore } from "@netlify/blobs";

export async function getSession(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return null;
  const sessions = getStore("sesiones");
  const sess = await sessions.get(token, { type: "json" });
  return sess;
}
