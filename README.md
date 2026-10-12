# CARGO HUB — Монголын карго компаниудад зориулсан multi-tenant SaaS

## Одоогийн төлөв (шударга тайлан)
| Хэсэг | Төлөв |
|---|---|
| PostgreSQL/Prisma схем (бүх 19 entity, индекс, unique, soft-delete) | ✅ Бичигдсэн (`prisma/schema.prisma`) |
| .env.example | ✅ |
| Next.js app, Auth, API, UI, seed, тест | ⏳ ХИЙГДЭЭГҮЙ. Дараагийн алхам |
| QR, GPS, offline, SMS, public tracking, төлбөрийн gateway | ⏳ Phase 2–3 |

Энэ хэсэгт ямар ч placeholder UI, хуурамч амжилттай мэдэгдэл байхгүй.

## Архитектурын шийдвэрүүд (default)
- **Tenant тусгаарлалт:** бүх хүснэгтэд `organizationId`. Сервер талд session-ээс organizationId авна (client-ийн утгад итгэхгүй). Өгөгдлийн сангийн түвшинд PostgreSQL Row-Level Security (`SET app.org_id` + policy) нэмнэ.
- **Жолооч–машин:** рейс бүрийн `DriverVehicleAssignment`-ээр.
- **Утас:** 8 оронтой хэлбэрээр хадгална, `+976` / `976` угтварыг цэвэрлэнэ. Давхардал зөвшөөрнө.
- **Давхар олголт хамгаалалт:** `SELECT ... FOR UPDATE` транзакц + `deliveredPieces` шалгалт.
- **Идемпотент бүртгэл:** `@@unique([organizationId, idempotencyKey])` нь offline sync, давхар даралтаас хамгаална.
- **Мөнгө:** бүхэл төгрөг (`Int`), тооцоо серверт.
- **GPS:** PWA зөвхөн апп нээлттэй, зөвшөөрөлтэй үед ажиллана. Тогтвортой background tracking нь Phase 3 (Capacitor/native).
- **SMS:** adapter + queue, анхдагчаар унтраалттай.

## Дараагийн алхам
1. `npx create-next-app` + shadcn/ui + Auth.js, `prisma migrate dev`
2. Seed (3 зохиомол компани), tenant-scoped data layer
3. Phase 1: login → жолооч/машин/рейс → ачаа бүртгэл → утасны хайлт → олголт → dashboard → тест
