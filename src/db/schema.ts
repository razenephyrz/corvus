import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  time,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

/**
 * Skema mengikuti kontrak tabel pada UI_SPEC (kelas, users, matkul, user_roles,
 * jadwal, tugas, tugas_status, pertemuan, absensi, pendaftaran_mahasiswa, audit_log).
 * Tabel tambahan: `pengumuman` dan `kalender_akademik` (sumber data resmi untuk
 * panel pengumuman dan kalender akademik; keduanya terpisah dari audit_log / jadwal).
 *
 * Otorisasi dilakukan di server (lib/auth.ts) karena stack ini memakai PostgreSQL
 * lokal, bukan Supabase RLS.
 */

export const kelas = pgTable("kelas", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  angkatan: integer("angkatan").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  email: text("email").notNull().unique(),
  nim: text("nim").unique(),
  passwordHash: text("password_hash").notNull(),
  kelasId: integer("kelas_id").references(() => kelas.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const matkul = pgTable("matkul", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  kelasId: integer("kelas_id")
    .notNull()
    .references(() => kelas.id),
  dosenNama: text("dosen_nama"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** role: 'superadmin' | 'ketua_kelas' | 'pj_matkul'. matkul_id hanya dipakai pj_matkul. */
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  role: text("role").notNull(),
  matkulId: integer("matkul_id").references(() => matkul.id),
});

export const jadwal = pgTable("jadwal", {
  id: serial("id").primaryKey(),
  matkulId: integer("matkul_id")
    .notNull()
    .references(() => matkul.id),
  hari: text("hari"),
  tanggalSpesifik: date("tanggal_spesifik", { mode: "string" }),
  jamMulai: time("jam_mulai").notNull(),
  jamSelesai: time("jam_selesai").notNull(),
  ruangan: text("ruangan"),
  isReschedule: boolean("is_reschedule").notNull().default(false),
  catatan: text("catatan"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tugas = pgTable("tugas", {
  id: serial("id").primaryKey(),
  matkulId: integer("matkul_id")
    .notNull()
    .references(() => matkul.id),
  judul: text("judul").notNull(),
  deskripsi: text("deskripsi"),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  dibuatOleh: integer("dibuat_oleh").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** status: 'belum' | 'progress' | 'selesai'. Tidak ada baris = belum ada status (dianggap BELUM). */
export const tugasStatus = pgTable(
  "tugas_status",
  {
    id: serial("id").primaryKey(),
    tugasId: integer("tugas_id")
      .notNull()
      .references(() => tugas.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("tugas_status_unique").on(t.tugasId, t.userId)],
);

export const pertemuan = pgTable("pertemuan", {
  id: serial("id").primaryKey(),
  matkulId: integer("matkul_id")
    .notNull()
    .references(() => matkul.id),
  tanggal: date("tanggal", { mode: "string" }).notNull(),
  pertemuanKe: integer("pertemuan_ke").notNull(),
  inputOleh: integer("input_oleh").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** status: 'hadir' | 'izin' | 'sakit' | 'alpha'. Tidak ada baris = belum diinput. */
export const absensi = pgTable(
  "absensi",
  {
    id: serial("id").primaryKey(),
    pertemuanId: integer("pertemuan_id")
      .notNull()
      .references(() => pertemuan.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull(),
    keterangan: text("keterangan"),
  },
  (t) => [unique("absensi_unique").on(t.pertemuanId, t.userId)],
);

/** status: 'pending' | 'approved' | 'rejected' */
export const pendaftaranMahasiswa = pgTable("pendaftaran_mahasiswa", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  nim: text("nim").notNull(),
  email: text("email").notNull(),
  kelasId: integer("kelas_id")
    .notNull()
    .references(() => kelas.id),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  aksi: text("aksi").notNull(),
  tabel: text("tabel").notNull(),
  recordId: integer("record_id"),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** kelas_id null = pengumuman untuk semua kelas. */
export const pengumuman = pgTable("pengumuman", {
  id: serial("id").primaryKey(),
  kelasId: integer("kelas_id").references(() => kelas.id),
  judul: text("judul").notNull(),
  ringkasan: text("ringkasan").notNull(),
  kategori: text("kategori").notNull().default("UMUM"),
  dibuatOleh: integer("dibuat_oleh").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const kalenderAkademik = pgTable("kalender_akademik", {
  id: serial("id").primaryKey(),
  tanggal: date("tanggal", { mode: "string" }).notNull(),
  judul: text("judul").notNull(),
  kategori: text("kategori").notNull().default("AKADEMIK"),
  keterangan: text("keterangan"),
});
