import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { createSession } from "@/lib/session";
export default function Login({ searchParams }: { searchParams: { error?: string } }) {
  async function login(fd: FormData) {
    "use server";
    const phone = normalizePhone(String(fd.get("phone") ?? ""));
    const user = phone ? await db.user.findUnique({ where: { phone }, include: { organization: true } }) : null;
    const ok = user && user.isActive && !user.deletedAt && (!user.organization || user.organization.isActive)
      && (await bcrypt.compare(String(fd.get("password") ?? ""), user.passwordHash));
    if (!user || !ok) redirect("/login?error=1");
    await createSession({ userId: user.id, role: user.role, organizationId: user.organizationId, name: user.name });
    redirect("/new");
  }
  return (
    <form action={login} className="mt-16 space-y-3 rounded-xl border bg-white p-6">
      <h1 className="text-xl font-semibold">Нэвтрэх</h1>
      {searchParams.error && <p className="text-sm text-red-600">Утас эсвэл нууц үг буруу байна.</p>}
      <input name="phone" inputMode="numeric" placeholder="Утасны дугаар" required className="w-full rounded border p-3" />
      <input name="password" type="password" placeholder="Нууц үг" required className="w-full rounded border p-3" />
      <button className="w-full rounded bg-blue-600 p-3 font-medium text-white">Нэвтрэх</button>
    </form>
  );
}
