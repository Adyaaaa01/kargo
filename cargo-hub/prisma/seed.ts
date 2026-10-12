import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
async function main() {
  if ((await db.user.count()) > 0) return console.log("Seed өмнө нь хийгдсэн.");
  const hash = await bcrypt.hash("cargo1234", 10); // ЗӨВХӨН хөгжүүлэлтийн орчин
  const plan = await db.subscriptionPlan.create({ data: { code: "STANDARD", name: "Standard", priceMnt: 99000, maxDrivers: 10, maxVehicles: 10, maxStaff: 10 } });
  await db.user.create({ data: { role: "SUPER_ADMIN", name: "Платформ админ", phone: "99000000", passwordHash: hash } });
  const orgs = [
    { name: "Дорнод Карго А", base: 99000100, plates: ["1234УБА", "5678УБА"] },
    { name: "Чойбалсан Экспресс", base: 99000200, plates: ["4321ДОА"] },
  ];
  for (const o of orgs) {
    const org = await db.organization.create({ data: { name: o.name, ownerName: "Эзэн", phone: String(o.base + 1), settings: { create: {} },
      subscription: { create: { planId: plan.id, status: "TRIAL", trialStartsAt: new Date(), trialEndsAt: new Date(Date.now() + 14 * 864e5) } } } });
    await db.user.create({ data: { organizationId: org.id, role: "COMPANY_ADMIN", name: o.name + " админ", phone: String(o.base + 1), passwordHash: hash } });
    await db.user.create({ data: { organizationId: org.id, role: "DISPATCHER", name: o.name + " ажилтан", phone: String(o.base + 2), passwordHash: hash } });
    for (let i = 0; i < o.plates.length; i++) {
      const u = await db.user.create({ data: { organizationId: org.id, role: "DRIVER", name: `Жолооч ${i + 1} (${o.name})`, phone: String(o.base + 10 + i), passwordHash: hash } });
      const d = await db.driver.create({ data: { organizationId: org.id, userId: u.id } });
      const v = await db.vehicle.create({ data: { organizationId: org.id, plate: o.plates[i], make: "Hyundai" } });
      const t = await db.trip.create({ data: { organizationId: org.id, code: `R-${i + 1}`, originCity: "Улаанбаатар", destinationCity: "Дорнод", driverId: d.id, vehicleId: v.id } });
      await db.driverVehicleAssignment.create({ data: { organizationId: org.id, driverId: d.id, vehicleId: v.id, tripId: t.id } });
    }
  }
  console.log("Seed дууслаа.");
}
main().finally(() => db.$disconnect());
