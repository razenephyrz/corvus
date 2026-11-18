export const TZ = "Asia/Jakarta";
export const HARI = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"] as const;
export const HARI_KERJA = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"] as const;

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
export const MONTHS_LONG = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER",
];

/** YYYY-MM-DD di zona waktu Asia/Jakarta */
export function todayStr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "03 NOV" dari 'YYYY-MM-DD' */
export function fmtShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const [, m, d] = dateStr.split("-");
  return `${d} ${MONTHS[Number(m) - 1]}`;
}

export function fmtFull(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

/** Tanggal+jam dari timestamptz, selalu di Asia/Jakarta */
export function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "2-digit",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")} ${MONTHS[Number(get("month")) - 1]} ${get("hour")}:${get("minute")}`;
}

export function fmtTime(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : "—";
}

/** nilai untuk <input type="datetime-local"> (waktu Jakarta) */
export function toInputDateTime(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, dateStyle: "short", timeStyle: "short" })
    .format(d)
    .replace(" ", "T");
}

/** parse nilai datetime-local sebagai waktu Jakarta (UTC+7) */
export function parseInputDateTime(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function hariFromDate(dateStr: string): string {
  return HARI[new Date(dateStr + "T12:00:00Z").getUTCDay()];
}

export function hariIni(): string {
  return hariFromDate(todayStr());
}

export const ABSEN_LABEL: Record<string, string> = {
  hadir: "HADIR",
  izin: "IZIN",
  sakit: "SAKIT",
  alpha: "ALPHA",
};
export const TUGAS_LABEL: Record<string, string> = {
  belum: "BELUM",
  progress: "PROGRESS",
  selesai: "SELESAI",
};

export function pct(a: number, b: number): number | null {
  return b > 0 ? Math.round((a / b) * 100) : null;
}
