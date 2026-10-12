import { randomBytes, randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { requireOrg } from "@/lib/session";
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = () => "CH-" + Array.from(randomBytes(8), (b) => ALPHA[b % ALPHA.length]).join("");
const ROLES = ["DRIVER", "DISPATCHER", "COMPANY_ADMIN"];

async function openTrip(s: { userId: string; role: string; organizationId: string }) {
  return db.trip.findFirst({
    where: { organizationId: s.organizationId, status: { in: ["REGISTERING", "LOADING"] },
      ...(s.role === "DRIVER" ? { driver: { userId: s.userId } } : {}) },
    include: { vehicle: true }, orderBy: { createdAt: "desc" },
  });
}

export default async function NewShipment({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const s = await requireOrg(ROLES);
  const trip = await openTrip(s);
  async function create(fd: FormData) {
    "use server";
    const s = await requireOrg(ROLES);
    const trip = await openTrip(s);
    const phone = normalizePhone(String(fd.get("phone") ?? ""));
    const pieces = Math.max(1, Math.min(500, parseInt(String(fd.get("pieces") ?? "1")) || 1));
    const key = String(fd.get("key") ?? "");
    if (!trip || !phone || !key) redirect("/new?error=1");
    const dup = await db.shipment.findUnique({ where: { organizationId_idempotencyKey: { organizationId: s.organizationId, idempotencyKey: key } } });
    if (dup) redirect("/new?ok=" + dup.trackingCode); // давхар даралт
    const total = Math.max(0, parseInt(String(fd.get("price") ?? "0")) || 0);
    const paid = fd.get("paid") ? total : 0;
    const sh = await db.$transaction(async (tx) => {
      const sh = await tx.shipment.create({ data: {
        organizationId: s.organizationId, trackingCode: code(), idempotencyKey: key, tripId: trip.id,
        receiverPhone: phone, pieceCount: pieces, description: String(fd.get("desc") ?? "") || null,
        totalPriceMnt: total, paidMnt: paid, createdById: s.userId,
        pieces: { create: Array.from({ length: pieces }, (_, i) => ({ seq: i + 1 })) },
      } });
      await tx.shipmentStatusHistory.create({ data: { organizationId: s.organizationId, shipmentId: sh.id, toStatus: "REGISTERED", changedById: s.userId } });
      await tx.auditLog.create({ data: { organizationId: s.organizationId, actorId: s.userId, action: "shipment.create", entity: "Shipment", entityId: sh.id } });
      return sh;
    });
    redirect("/new?ok=" + sh.trackingCode);
  }
  if (!trip) return <p className="rounded border bg-white p-4">Бүртгэл авч байгаа идэвхтэй рейс алга.</p>;
  return (
    <form action={create} className="space-y-3">
      <p className="text-sm text-slate-500">Рейс {trip.code} · {trip.vehicle.plate} · {trip.originCity} → {trip.destinationCity}</p>
      {searchParams.ok && <p className="rounded bg-green-100 p-3 text-green-800">Бүртгэгдлээ: {searchParams.ok}</p>}
      {searchParams.error && <p className="rounded bg-red-100 p-3 text-red-800">8 оронтой утасны дугаар оруулна уу.</p>}
      <input type="hidden" name="key" value={randomUUID()} />
      <input name="phone" inputMode="numeric" autoFocus required placeholder="Хүлээн авагчийн утас" className="w-full rounded border p-4 text-2xl" />
      <input name="pieces" type="number" inputMode="numeric" min={1} defaultValue={1} className="w-full rounded border p-4 text-2xl" />
      <input name="desc" placeholder="Тайлбар (заавал биш)" className="w-full rounded border p-3" />
      <input name="price" type="number" inputMode="numeric" placeholder="Төлбөр ₮ (заавал биш)" className="w-full rounded border p-3" />
      <label className="flex items-center gap-2"><input type="checkbox" name="paid" /> Төлбөр төлөгдсөн</label>
      <button className="w-full rounded-xl bg-blue-600 p-5 text-xl font-semibold text-white">БҮРТГЭХ</button>
    </form>
  );
}
