import "./globals.css";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
export const metadata = { title: "CARGO HUB" };
async function logout() { "use server"; cookies().delete("session"); redirect("/login"); }
export default async function Root({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  return (
    <html lang="mn"><body>
      {s && (
        <header className="flex items-center gap-4 border-b bg-white px-4 py-3 text-sm">
          <b className="text-blue-600">CARGO HUB</b>
          <Link href="/new">Шинэ ачаа</Link>
          {s.role !== "DRIVER" && <Link href="/search">Ачаа хайх / Олгох</Link>}
          <span className="ml-auto text-slate-500">{s.name}</span>
          <form action={logout}><button className="text-blue-600">Гарах</button></form>
        </header>
      )}
      <main className="mx-auto max-w-xl p-4">{children}</main>
    </body></html>
  );
}
