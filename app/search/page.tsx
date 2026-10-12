import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { requireOrg } from "@/lib/session";
const ROLES = ["DISPATCHER", "COMPANY_ADMIN"];
const L: Record<string, string> = { REGISTERED: "Бүртгэгдсэн", LOADED: "Машинд ачсан", IN_TRANSIT: "Замд явж байна", ARRIVED: "Ирсэн", READY_FOR_PICKUP: "Олгоход бэлэн", DELIVERED: "Олгосон", DELIVERY_FAILED: "Олголт амжилтгүй", RETURNED: "Буцаасан", PROBLEM: "Асуудалтай", CANCELLED: "Цуцлагдсан" };

export default async function Search({ searchParams }: { searchParams: { q?: string; err?: string } }) {
  const s = await requireOrg(ROLES);
  const q = (searchParams.q ?? "").replace(/\D/g, "");
  const items = q.length >= 3 ? await db.shipment.findMany({
    where: { organizationId: s.organizationId, deletedAt: null,
      OR: [{ receiverPhone: { startsWith: q } }, { receiverPhone: { endsWith: q } }, { trackingCode: { equals: searchParams.q?.trim().toUpperCase() } }] },
    include: { trip: { include: { vehicle: true, driver: { include: { user: true } } } } },
    orderBy: { createdAt: "desc" }, take: 50 } ) : [];

  async function deliver(fd: FormData) {
    "use server";
    const s = await requireOrg(ROLES);
    const id = String(fd.get("id"));
    const back = "/search?q=" + encodeURIComponent(String(fd.get("q") ?? ""));
    const res = await db.$transaction(async (tx) => {
      // Мөрийг түгжиж давхар олголтоос хамгаална
      const rows = await tx.$queryRaw<{ status: string; pieceCount: number }[]>`
        SELECT status::text, "pieceCount" FROM "Shipment" WHERE id = ${id} AND "organizationId" = ${s.organizationId} FOR UPDATE`;
      const r = rows[0];
      if (!r) return "notfound";
      if (r.status === "DELIVERED") return "already";
      if (["CANCELLED", "RETURNED"].includes(r.status)) return "invalid";
      await tx.shipmentPiece.updateMany({ where: { shipmentId: id, deliveredAt: null }, data: { deliveredAt: new Date() } });
      await tx.shipment.update({ where: { id }, data: { status: "DELIVERED", deliveredPieces: r.pieceCount } });
      await tx.shipmentStatusHistory.create({ data: { organizationId: s.organizationId, shipmentId: id, fromStatus: r.status as never, toStatus: "DELIVERED", changedById: s.userId } });
      await tx.shipmentHandoverRecord.create({ data: { organizationId: s.organizationId, shipmentId: id, piecesHanded: r.pieceCount, handedById: s.userId } });
      await tx.auditLog.create({ data: { organizationId: s.organizationId, actorId: s.userId, action: "shipment.deliver", entity: "Shipment", entityId: id } });
      return "ok";
    });
    redirect(back + (res === "ok" ? "" : "&err=" + res));
  }
  return (
    <div className="space-y-3">
      <form className="flex gap-2"><input name="q" defaultValue={searchParams.q} inputMode="numeric" autoFocus placeholder="Утасны дугаар (эхний/сүүлийн хэсэг) эсвэл код" className="flex-1 rounded border p-3" /><button className="rounded bg-blue-600 px-4 text-white">Хайх</button></form>
      {searchParams.err && <p className="rounded bg-red-100 p-3 text-red-800">{searchParams.err === "already" ? "Энэ ачааг аль хэдийн олгосон байна!" : "Олгох боломжгүй байна."}</p>}
      {q.length >= 3 && items.length === 0 && <p className="text-slate-500">Ачаа олдсонгүй.</p>}
      {items.map((i) => (
        <div key={i.id} className="rounded-xl border bg-white p-4 text-sm">
          <div className="text-lg font-semibold">{i.receiverPhone} · {i.pieceCount} боодол</div>
          <div className="text-slate-500">{i.trackingCode} · {i.trip.vehicle.plate} · {i.trip.driver.user.name} · {i.trip.code} · {i.createdAt.toLocaleDateString("mn-MN")}</div>
          <div className="mt-1">{L[i.status]} · {i.paidMnt >= i.totalPriceMnt ? "Төлсөн" : `Үлдэгдэл ${(i.totalPriceMnt - i.paidMnt).toLocaleString()}₮`}</div>
          {i.status !== "DELIVERED" && <form action={deliver} className="mt-2"><input type="hidden" name="id" value={i.id} /><input type="hidden" name="q" value={searchParams.q ?? ""} /><button className="rounded bg-green-600 px-5 py-2 font-semibold text-white">ОЛГОХ</button></form>}
        </div>
      ))}
    </div>
  );
}
