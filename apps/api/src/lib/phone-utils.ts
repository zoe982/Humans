export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function phonesMatch(a: string, b: string): boolean {
  const normA = normalizePhone(a);
  const normB = normalizePhone(b);
  if (normA.length < 9 || normB.length < 9) return false;
  return normA.slice(-9) === normB.slice(-9);
}
