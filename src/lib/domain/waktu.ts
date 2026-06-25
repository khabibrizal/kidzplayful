// src/lib/domain/waktu.ts
export function sisaDetik(terpakaiDetik: number, batasMenit: number): number {
  return Math.max(0, batasMenit * 60 - terpakaiDetik);
}
export function waktuHabis(terpakaiDetik: number, batasMenit: number): boolean {
  return terpakaiDetik >= batasMenit * 60;
}
export function kunciHari(anakId: string, sekarang: Date): string {
  const ymd = sekarang.toISOString().slice(0, 10);
  return `kp_waktu_${anakId}_${ymd}`;
}
