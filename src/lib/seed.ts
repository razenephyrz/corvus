import { sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { addDays, todayStr } from "@/lib/format";

export const DEMO_PASSWORD = "password123";

/** Akun dummy untuk demo login. Semua berkata sandi `password123`. */
export const DEMO_ACCOUNTS = [
  { label: "USER · MAHASISWA KELAS C", email: "budi@mhs.demo", note: "Hanya lihat + ubah status tugas sendiri" },
  { label: "ADMIN · KETUA KELAS C", email: "ketua.c@mhs.demo", note: "Edit jadwal, absen, tugas kelas C saja" },
  { label: "ADMIN · PJ MATKUL (BASIS DATA C)", email: "pj.c@mhs.demo", note: "Edit hanya matkul Basis Data kelas C" },
  { label: "ADMIN · KETUA KELAS A", email: "ketua.a@mhs.demo", note: "Edit data kelas A saja" },
  { label: "SUPERADMIN · DEVS", email: "devs@portal.demo", note: "Semua kelas + statistik menyeluruh" },
] as const;

let seeding: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!seeding) {
    seeding = runSeed().catch((e) => {
      seeding = null;
      throw e;
    });
  }
  return seeding;
}

async function runSeed() {
  const res = await db.execute(sql`select count(*)::int as n from users`);
  if (Number((res.rows[0] as { n: number }).n) > 0) return;

  const pw = hashPassword(DEMO_PASSWORD);
  const today = todayStr();

  const kelasRows = await db
    .insert(s.kelas)
    .values([
      { nama: "A", angkatan: 2024 },
      { nama: "B", angkatan: 2024 },
      { nama: "C", angkatan: 2024 },
    ])
    .returning();
  const K = Object.fromEntries(kelasRows.map((k) => [k.nama, k.id]));

  const mkDefs = [
    { nama: "Basis Data", dosen: "Dr. Rahmat Hidayat", hari: "SENIN", m: "08:00", e: "09:40", r: "Lab 1" },
    { nama: "Jaringan Komputer", dosen: "Ir. Lestari Wulandari", hari: "SELASA", m: "10:00", e: "11:40", r: "R. 204" },
    { nama: "Rekayasa Perangkat Lunak", dosen: "Dr. Bagus Prasetyo", hari: "RABU", m: "13:00", e: "14:40", r: "R. 305" },
    { nama: "Statistika", dosen: "Dra. Maya Kusuma", hari: "KAMIS", m: "08:00", e: "09:40", r: "R. 101" },
  ];
  const matkulBy: Record<string, { id: number; nama: string }[]> = {};
  for (const kn of ["A", "B", "C"]) {
    const rows = await db
      .insert(s.matkul)
      .values(mkDefs.map((d) => ({ nama: d.nama, kelasId: K[kn], dosenNama: d.dosen })))
      .returning();
    matkulBy[kn] = rows;
    await db.insert(s.jadwal).values(
      rows.map((m, i) => ({
        matkulId: m.id,
        hari: mkDefs[i].hari,
        jamMulai: mkDefs[i].m,
        jamSelesai: mkDefs[i].e,
        ruangan: kn === "B" && i === 0 ? "Lab 2" : mkDefs[i].r,
        isReschedule: kn === "C" && i === 1,
        catatan: kn === "C" && i === 1 ? "Dipindah dari R. 204 (contoh data)" : null,
      })),
    );
  }

  // Mahasiswa
  const mhs: Record<string, { id: number; nama: string }[]> = { A: [], B: [], C: [] };
  const names = {
    A: ["Ketua Kelas A", "Citra Lestari", "Dimas Anggara"],
    B: ["Eka Putri", "Fajar Nugroho", "Gita Permata"],
    C: ["Ketua Kelas C", "Budi Santoso", "PJ Matkul C", "Indah Sari"],
  } as const;
  const emails = {
    A: ["ketua.a@mhs.demo", "citra@mhs.demo", "dimas@mhs.demo"],
    B: ["eka@mhs.demo", "fajar@mhs.demo", "gita@mhs.demo"],
    C: ["ketua.c@mhs.demo", "budi@mhs.demo", "pj.c@mhs.demo", "indah@mhs.demo"],
  } as const;
  let nimSeq = 1;
  for (const kn of ["A", "B", "C"] as const) {
    const list = names[kn].map((nama, i) => ({
      nama,
      email: emails[kn][i],
      nim: `2024${String(nimSeq++).padStart(6, "0")}`,
      passwordHash: pw,
      kelasId: K[kn],
    }));
    mhs[kn] = await db.insert(s.users).values(list).returning({ id: s.users.id, nama: s.users.nama });
  }
  const [devs] = await db
    .insert(s.users)
    .values({ nama: "Devs Portal", email: "devs@portal.demo", nim: null, passwordHash: pw, kelasId: null })
    .returning();

  await db.insert(s.userRoles).values([
    { userId: mhs.A[0].id, role: "ketua_kelas", matkulId: null },
    { userId: mhs.B[0].id, role: "ketua_kelas", matkulId: null },
    { userId: mhs.C[0].id, role: "ketua_kelas", matkulId: null },
    { userId: mhs.C[2].id, role: "pj_matkul", matkulId: matkulBy.C[0].id },
    { userId: devs.id, role: "superadmin", matkulId: null },
  ]);

  // Pertemuan + absensi (3 pertemuan lampau per matkul; pertemuan ke-3 belum semua diinput)
  const statuses = ["hadir", "hadir", "izin", "hadir", "sakit", "hadir", "alpha", "hadir"];
  let si = 0;
  for (const kn of ["A", "B", "C"] as const) {
    for (const [mi, m] of matkulBy[kn].entries()) {
      for (let p = 1; p <= 3; p++) {
        const [pt] = await db
          .insert(s.pertemuan)
          .values({
            matkulId: m.id,
            tanggal: addDays(today, -7 * (4 - p) - mi),
            pertemuanKe: p,
            inputOleh: mhs[kn][0].id,
          })
          .returning();
        const rows = mhs[kn]
          .filter((_, ui) => !(p === 3 && ui === 1 && mi % 2 === 0)) // sebagian belum diinput
          .map((u) => ({
            pertemuanId: pt.id,
            userId: u.id,
            status: statuses[si++ % statuses.length],
            keterangan: null as string | null,
          }));
        await db.insert(s.absensi).values(rows);
      }
    }
  }

  // Tugas
  const now = Date.now();
  const day = 86400000;
  const tugasDefs = [
    { judul: "ERD & Normalisasi", d: 3 },
    { judul: "Laporan Praktikum Subnetting", d: 6 },
    { judul: "Dokumen SRS", d: 9 },
    { judul: "Analisis Regresi Sederhana", d: -2 },
  ];
  const tStat = ["selesai", "progress", "belum", "selesai", "progress"];
  let ti = 0;
  for (const kn of ["A", "B", "C"] as const) {
    for (const [mi, m] of matkulBy[kn].entries()) {
      const def = tugasDefs[mi];
      const dl = new Date(now + def.d * day);
      dl.setUTCHours(16, 59, 0, 0); // 23:59 WIB
      const [t] = await db
        .insert(s.tugas)
        .values({
          matkulId: m.id,
          judul: def.judul,
          deskripsi: `Kerjakan ${def.judul.toLowerCase()} sesuai petunjuk dosen. (Data contoh)`,
          deadline: dl,
          dibuatOleh: mhs[kn][0].id,
        })
        .returning();
      await db.insert(s.tugasStatus).values(
        mhs[kn]
          .filter((_, ui) => ui !== 3) // sebagian belum punya status
          .map((u) => ({ tugasId: t.id, userId: u.id, status: tStat[ti++ % tStat.length] })),
      );
    }
  }

  await db.insert(s.pendaftaranMahasiswa).values([
    { nama: "Joko Widodo (contoh)", nim: "2024000901", email: "joko@calon.demo", kelasId: K.C },
    { nama: "Kartika Dewi (contoh)", nim: "2024000902", email: "kartika@calon.demo", kelasId: K.A },
    { nama: "Lukman Hakim (contoh)", nim: "2024000903", email: "lukman@calon.demo", kelasId: K.C },
  ]);

  await db.insert(s.pengumuman).values([
    {
      kelasId: null,
      kategori: "AKADEMIK",
      judul: "Portal akademik versi demo",
      ringkasan: "Seluruh data pada portal ini adalah data contoh untuk keperluan demo.",
      dibuatOleh: devs.id,
    },
    {
      kelasId: K.C,
      kategori: "KELAS C",
      judul: "Diskusi ERD sebelum kelas Basis Data",
      ringkasan: "Diskusi ERD dilakukan sebelum kelas Basis Data. Siapkan draft masing-masing.",
      dibuatOleh: mhs.C[0].id,
    },
    {
      kelasId: K.A,
      kategori: "KELAS A",
      judul: "Rapat koordinasi kelas A",
      ringkasan: "Rapat singkat membahas jadwal praktikum minggu depan.",
      dibuatOleh: mhs.A[0].id,
    },
  ]);

  await db.insert(s.kalenderAkademik).values([
    { tanggal: addDays(today, 5), judul: "Batas pengisian KRS (contoh)", kategori: "ADMINISTRASI", keterangan: "Data contoh — ganti dengan tanggal resmi." },
    { tanggal: addDays(today, 12), judul: "Awal pekan ujian tengah semester (contoh)", kategori: "UJIAN", keterangan: "Data contoh — ganti dengan tanggal resmi." },
    { tanggal: addDays(today, 12), judul: "Pengumuman dosen penguji (contoh)", kategori: "UJIAN", keterangan: "Data contoh." },
    { tanggal: addDays(today, 19), judul: "Hari libur akademik (contoh)", kategori: "LIBUR", keterangan: "Data contoh — ganti dengan tanggal resmi." },
    { tanggal: addDays(today, 34), judul: "Batas administrasi akademik (contoh)", kategori: "ADMINISTRASI", keterangan: "Data contoh." },
  ]);
}
