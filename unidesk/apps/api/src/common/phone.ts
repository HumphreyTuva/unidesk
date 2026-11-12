// Kenyan mobile numbers -> 2547XXXXXXXX / 2541XXXXXXXX (the format Daraja wants). Returns null if it does not look right.
export function normalizePhone(input: string): string | null {
  const d = String(input).replace(/[\s()-]/g, '').replace(/^\+/, '');
  let n: string;
  if (/^0[17]\d{8}$/.test(d)) n = '254' + d.slice(1);
  else if (/^254[17]\d{8}$/.test(d)) n = d;
  else if (/^[17]\d{8}$/.test(d)) n = '254' + d;
  else return null;
  return n;
}

// 254712345678 -> 0712 *** 678, for admin lists (full numbers stay in the database).
export function maskPhone(p: string): string {
  const local = p.startsWith('254') ? '0' + p.slice(3) : p;
  return `${local.slice(0, 4)} *** ${local.slice(-3)}`;
}
