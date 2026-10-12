// "+976 9911-2233", "976 99112233" -> "99112233". Буруу бол null.
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("976") && d.length === 11) d = d.slice(3);
  return /^\d{8}$/.test(d) ? d : null;
}
