import { and, asc, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { HARI, todayStr } from "@/lib/format";

export async function getKelasList() {
  return db.select().from(s.kelas).orderBy(asc(s.kelas.nama));
}

export async function getJadwal(kelasId: number | null) {
  const rows = await db
    .select({
      id: s.jadwal.id,
      matkulId: s.jadwal.matkulId,
      matkul: s.matkul.nama,
      dosen: s.matkul.dosenNama,
      kelasId: s.matkul.kelasId,
      kelas: s.kelas.nama,
      hari: s.jadwal.hari,
      tanggal: s.jadwal.tanggalSpesifik,
      mulai: s.jadwal.jamMulai,
      selesai: s.jadwal.jamSelesai,
      ruangan: s.jadwal.ruangan,
      isReschedule: s.jadwal.isReschedule,
      catatan: s.jadwal.catatan,
      updatedAt: s.jadwal.updatedAt,
    })
    .from(s.jadwal)
    .innerJoin(s.matkul, eq(s.matkul.id, s.jadwal.matkulId))
    .innerJoin(s.kelas, eq(s.kelas.id, s.matkul.kelasId))
    .where(kelasId ? eq(s.matkul.kelasId, kelasId) : undefined);
  const order = (h: string | null) => {
    const i = h ? HARI.indexOf(h as (typeof HARI)[number]) : -1;
    return i <= 0 ? (i === 0 ? 7 : 99) : i; // minggu di akhir, tanpa hari paling akhir
  };
  return rows.sort(
    (a, b) =>
      order(a.hari) - order(b.hari) ||
      a.mulai.localeCompare(b.mulai) ||
      a.kelas.localeCompare(b.kelas),
  );
}

/** Semua pertemuan di kelas user + status absensi milik user (null = belum ada data). */
export async function getAbsensiUser(userId: number, kelasId: number, limit = 200) {
  return db
    .select({
      pertemuanId: s.pertemuan.id,
      tanggal: s.pertemuan.tanggal,
      ke: s.pertemuan.pertemuanKe,
      matkul: s.matkul.nama,
      status: s.absensi.status,
      keterangan: s.absensi.keterangan,
    })
    .from(s.pertemuan)
    .innerJoin(s.matkul, and(eq(s.matkul.id, s.pertemuan.matkulId), eq(s.matkul.kelasId, kelasId)))
    .leftJoin(
      s.absensi,
      and(eq(s.absensi.pertemuanId, s.pertemuan.id), eq(s.absensi.userId, userId)),
    )
    .orderBy(desc(s.pertemuan.tanggal), asc(s.matkul.nama))
    .limit(limit);
}

export function summarizeAbsensi(rows: { status: string | null }[]) {
  const c = { hadir: 0, izin: 0, sakit: 0, alpha: 0, kosong: 0 };
  for (const r of rows) {
    if (!r.status) c.kosong++;
    else if (r.status in c) c[r.status as keyof typeof c]++;
  }
  const tercatat = c.hadir + c.izin + c.sakit + c.alpha;
  // Aturan: persentase hadir = HADIR ÷ pertemuan yang sudah memiliki catatan
  return { ...c, tercatat, total: rows.length, persen: tercatat ? Math.round((c.hadir / tercatat) * 100) : null };
}

export async function getTugasUser(userId: number, kelasId: number) {
  return db
    .select({
      id: s.tugas.id,
      judul: s.tugas.judul,
      deskripsi: s.tugas.deskripsi,
      deadline: s.tugas.deadline,
      matkul: s.matkul.nama,
      status: s.tugasStatus.status,
      statusAt: s.tugasStatus.updatedAt,
    })
    .from(s.tugas)
    .innerJoin(s.matkul, and(eq(s.matkul.id, s.tugas.matkulId), eq(s.matkul.kelasId, kelasId)))
    .leftJoin(
      s.tugasStatus,
      and(eq(s.tugasStatus.tugasId, s.tugas.id), eq(s.tugasStatus.userId, userId)),
    )
    .orderBy(asc(s.tugas.deadline));
}

/** Tugas dalam scope kelas + rekap status seluruh mahasiswa kelas. */
export async function getTugasScope(kelasId: number | null) {
  const rows = await db
    .select({
      id: s.tugas.id,
      matkulId: s.tugas.matkulId,
      judul: s.tugas.judul,
      deskripsi: s.tugas.deskripsi,
      deadline: s.tugas.deadline,
      matkul: s.matkul.nama,
      kelasId: s.matkul.kelasId,
      kelas: s.kelas.nama,
    })
    .from(s.tugas)
    .innerJoin(s.matkul, eq(s.matkul.id, s.tugas.matkulId))
    .innerJoin(s.kelas, eq(s.kelas.id, s.matkul.kelasId))
    .where(kelasId ? eq(s.matkul.kelasId, kelasId) : undefined)
    .orderBy(asc(s.tugas.deadline));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const counts = await db
    .select({ tugasId: s.tugasStatus.tugasId, status: s.tugasStatus.status, n: sql<number>`count(*)::int` })
    .from(s.tugasStatus)
    .where(inArray(s.tugasStatus.tugasId, ids))
    .groupBy(s.tugasStatus.tugasId, s.tugasStatus.status);
  const students = await db
    .select({ kelasId: s.users.kelasId, n: sql<number>`count(*)::int` })
    .from(s.users)
    .where(sql`${s.users.kelasId} is not null`)
    .groupBy(s.users.kelasId);
  const stuBy = new Map(students.map((x) => [x.kelasId, x.n]));
  return rows.map((r) => {
    const mine = counts.filter((c) => c.tugasId === r.id);
    const get = (st: string) => mine.find((c) => c.status === st)?.n ?? 0;
    const total = stuBy.get(r.kelasId) ?? 0;
    return { ...r, total, selesai: get("selesai"), progress: get("progress"), belum: total - get("selesai") - get("progress") };
  });
}

export async function getPertemuan(matkulId: number) {
  return db
    .select()
    .from(s.pertemuan)
    .where(eq(s.pertemuan.matkulId, matkulId))
    .orderBy(desc(s.pertemuan.pertemuanKe));
}

export async function getAbsensiMatrix(pertemuanId: number, kelasId: number) {
  return db
    .select({
      userId: s.users.id,
      nama: s.users.nama,
      nim: s.users.nim,
      status: s.absensi.status,
      keterangan: s.absensi.keterangan,
    })
    .from(s.users)
    .leftJoin(
      s.absensi,
      and(eq(s.absensi.userId, s.users.id), eq(s.absensi.pertemuanId, pertemuanId)),
    )
    .where(eq(s.users.kelasId, kelasId))
    .orderBy(asc(s.users.nama));
}

export async function getPengumuman(kelasId: number | null | "all", limit = 5) {
  return db
    .select({
      id: s.pengumuman.id,
      judul: s.pengumuman.judul,
      ringkasan: s.pengumuman.ringkasan,
      kategori: s.pengumuman.kategori,
      createdAt: s.pengumuman.createdAt,
      kelasId: s.pengumuman.kelasId,
    })
    .from(s.pengumuman)
    .where(
      kelasId === "all"
        ? undefined
        : kelasId
          ? or(isNull(s.pengumuman.kelasId), eq(s.pengumuman.kelasId, kelasId))
          : isNull(s.pengumuman.kelasId),
    )
    .orderBy(desc(s.pengumuman.createdAt))
    .limit(limit);
}

export async function getKalender(fromDate?: string, toDate?: string) {
  const conds = [];
  if (fromDate) conds.push(sql`${s.kalenderAkademik.tanggal} >= ${fromDate}`);
  if (toDate) conds.push(sql`${s.kalenderAkademik.tanggal} <= ${toDate}`);
  return db
    .select()
    .from(s.kalenderAkademik)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(s.kalenderAkademik.tanggal), asc(s.kalenderAkademik.id));
}

export async function getUpcomingEvents(limit = 5) {
  return db
    .select()
    .from(s.kalenderAkademik)
    .where(gte(s.kalenderAkademik.tanggal, todayStr()))
    .orderBy(asc(s.kalenderAkademik.tanggal))
    .limit(limit);
}

export async function getKetuaKelas(kelasId: number) {
  const rows = await db
    .select({ nama: s.users.nama, email: s.users.email })
    .from(s.userRoles)
    .innerJoin(s.users, eq(s.users.id, s.userRoles.userId))
    .where(and(eq(s.userRoles.role, "ketua_kelas"), eq(s.users.kelasId, kelasId)));
  return rows[0] ?? null;
}

export async function getMatkulByKelas(kelasId: number | null) {
  return db
    .select({
      id: s.matkul.id,
      nama: s.matkul.nama,
      dosen: s.matkul.dosenNama,
      kelasId: s.matkul.kelasId,
      kelas: s.kelas.nama,
    })
    .from(s.matkul)
    .innerJoin(s.kelas, eq(s.kelas.id, s.matkul.kelasId))
    .where(kelasId ? eq(s.matkul.kelasId, kelasId) : undefined)
    .orderBy(asc(s.kelas.nama), asc(s.matkul.nama));
}

export type KelasStat = {
  id: number;
  nama: string;
  angkatan: number;
  mahasiswa: number;
  matkul: number;
  tugas: number;
  absensiTotal: number;
  absensiHadir: number;
  tugasSelesai: number;
  tugasSlot: number;
  pendaftaranPending: number;
};

export async function getKelasStats(kelasId?: number | null): Promise<KelasStat[]> {
  const res = await db.execute(sql`
    select k.id, k.nama, k.angkatan,
      (select count(*) from users u where u.kelas_id = k.id)::int as mahasiswa,
      (select count(*) from matkul m where m.kelas_id = k.id)::int as matkul,
      (select count(*) from tugas t join matkul m on m.id = t.matkul_id where m.kelas_id = k.id)::int as tugas,
      (select count(*) from absensi a join pertemuan p on p.id = a.pertemuan_id
         join matkul m on m.id = p.matkul_id where m.kelas_id = k.id)::int as absensi_total,
      (select count(*) from absensi a join pertemuan p on p.id = a.pertemuan_id
         join matkul m on m.id = p.matkul_id where m.kelas_id = k.id and a.status = 'hadir')::int as absensi_hadir,
      (select count(*) from tugas_status ts join tugas t on t.id = ts.tugas_id
         join matkul m on m.id = t.matkul_id where m.kelas_id = k.id and ts.status = 'selesai')::int as tugas_selesai,
      ((select count(*) from tugas t join matkul m on m.id = t.matkul_id where m.kelas_id = k.id)
         * (select count(*) from users u where u.kelas_id = k.id))::int as tugas_slot,
      (select count(*) from pendaftaran_mahasiswa pm where pm.kelas_id = k.id and pm.status = 'pending')::int as pending
    from kelas k
    ${kelasId ? sql`where k.id = ${kelasId}` : sql``}
    order by k.nama
  `);
  return (res.rows as Record<string, number | string>[]).map((r) => ({
    id: Number(r.id),
    nama: String(r.nama),
    angkatan: Number(r.angkatan),
    mahasiswa: Number(r.mahasiswa),
    matkul: Number(r.matkul),
    tugas: Number(r.tugas),
    absensiTotal: Number(r.absensi_total),
    absensiHadir: Number(r.absensi_hadir),
    tugasSelesai: Number(r.tugas_selesai),
    tugasSlot: Number(r.tugas_slot),
    pendaftaranPending: Number(r.pending),
  }));
}

/** Deadline terdekat yang belum selesai. Mahasiswa: status pribadi. Superadmin: seluruh kelas. */
export async function getUpcomingDeadlines(
  user: { id: number; kelasId: number | null; uiRole: string },
  limit = 3,
) {
  const now = new Date();
  if (user.kelasId) {
    const all = await getTugasUser(user.id, user.kelasId);
    return all
      .filter((t) => t.deadline >= now && t.status !== "selesai")
      .slice(0, limit)
      .map((t) => ({ id: t.id, judul: t.judul, matkul: t.matkul, deadline: t.deadline, status: t.status ?? "belum", kelas: null as string | null }));
  }
  const all = await getTugasScope(null);
  return all
    .filter((t) => t.deadline >= now)
    .slice(0, limit)
    .map((t) => ({ id: t.id, judul: t.judul, matkul: t.matkul, deadline: t.deadline, status: null as string | null, kelas: t.kelas }));
}

export async function getNextClass(kelasId: number | null) {
  if (!kelasId) return null;
  const list = (await getJadwal(kelasId)).filter((j) => j.hari);
  if (!list.length) return null;
  const nowIdx = new Date(todayStr() + "T12:00:00Z").getUTCDay();
  const hhmm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const scored = list.map((j) => {
    const di = HARI.indexOf(j.hari as (typeof HARI)[number]);
    let diff = (di - nowIdx + 7) % 7;
    if (diff === 0 && j.mulai.slice(0, 5) <= hhmm) diff = 7;
    return { j, diff };
  });
  scored.sort((a, b) => a.diff - b.diff || a.j.mulai.localeCompare(b.j.mulai));
  return scored[0].j;
}
