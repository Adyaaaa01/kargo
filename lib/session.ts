import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET!);
export type Session = { userId: string; role: string; organizationId: string | null; name: string };
export async function createSession(s: Session) {
  const t = await new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(key());
  cookies().set("session", t, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
}
export async function getSession(): Promise<Session | null> {
  const t = cookies().get("session")?.value;
  if (!t) return null;
  try { return (await jwtVerify(t, key())).payload as unknown as Session; } catch { return null; }
}
// Байгууллагын ID зөвхөн session-ээс. Клиентээс хэзээ ч авахгүй.
export async function requireOrg(roles: string[]) {
  const s = await getSession();
  if (!s || !s.organizationId || !roles.includes(s.role)) redirect("/login");
  return s as Session & { organizationId: string };
}
