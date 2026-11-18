"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, max } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import {
  canManageKelas,
  canManageMatkul,
  endSession,
  getSession,
  requireSuperadmin,
  requireUser,
  startSession,
  verifyPassword,
  type SessionUser,
} from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { parseInputDateTime } from "@/lib/format";

/* ───────── helpers ───────── */

function str(fd: FormData, k: string): string {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}
function int(fd: FormData, k: string): number | null {
  const n = Number(str(fd, k));
  return Number.isInteger(n) && n > 0 ? n : null;
}
function safePath(p: string, fallback: string): string {
  return p.startsWith("/") && !p.startsWith("//") ? p : fallback;
}
function back(path: string, kind: "ok" | "err", msg: string): never {
  const clean = path.replace(/([?&])(ok|err)=[^&]*/g, "$1").replace(/[?&]$/, "");
  const sep = clean.includes("?") ? "&" : "?";
  redirect(`${clean}${sep}${kind}=${encodeURIComponent(msg)}`);
}
async function audit(
  u: SessionUser,
  aksi: string,
  tabel: string,
  recordId: number | null,
  oldData: unknown,
  newData: unknown,
) {
  await db.insert(s.auditLog).values({
    userId: u.id,
    aksi,
    tabel,
    recordId,
    oldData: oldData ?? null,
    newData: newData ?? null,
  });
}
const DENIED = "Akses ditolak: Anda tidak berwenang untuk data ini.";

/* ───────── auth ───────── */

export async function loginAction(fd: FormData) {
  await ensureSeeded();
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  const [u] = await db.select().from(s.users).where(eq(s.users.email, email));
  if (!u || !verifyPassword(password, u.passwordHash)) {
    redirect("/login?err=" + encodeURIComponent("Email atau kata sandi salah."));
  }
  await startSession(u.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

/* ───────── tugas ───────── */

export async function updateTugasStatus(fd: FormData) {
  const u = await requireUser();
  const to = safePath(str(fd, "returnTo"), "/tugas");
  const tugasId = int(fd, "tugasId");
  const status = str(fd, "status");
  if (!tugasId || !["belum", "progress", "selesai"].includes(status)) back(to, "err", "Permintaan tidak valid.");
  if (!u.kelasId) back(to, "err", DENIED);
  const [t] = await db
    .select({ kelasId: s.matkul.kelasId })
    .from(s.tugas)
    .innerJoin(s.matkul, eq(s.matkul.id, s.tugas.matkulId))
    .where(eq(s.tugas.id, tugasId));
  if (!t || t.kelasId !== u.kelasId) back(to, "err", DENIED);
  // Selalu memakai user.id dari sesi — tidak pernah dari input form.
  await db
    .insert(s.tugasStatus)
    .values({ tugasId, userId: u.id, status })
    .onConflictDoUpdate({
      target: [s.tugasStatus.tugasId, s.tugasStatus.userId],
      set: { status, updatedAt: new Date() },
    });
  revalidatePath("/", "layout");
  back(to, "ok", "Status tugas diperbarui.");
}

export async function saveTugas(fd: FormData) {
  const u = await requireUser();
  const to = safePath(str(fd, "returnTo"), "/tugas");
  const id = int(fd, "id");
  const matkulId = int(fd, "matkulId");
  const judul = str(fd, "judul");
  const deskripsi = str(fd, "deskripsi");
  const deadline = parseInputDateTime(str(fd, "deadline"));
  if (!matkulId || !judul || !deadline) back(to, "err", "Mata kuliah, judul, dan deadline wajib diisi.");
  if (!(await canManageMatkul(u, matkulId))) back(to, "err", DENIED);
  if (id) {
    const [old] = await db.select().from(s.tugas).where(eq(s.tugas.id, id));
    if (!old || !(await canManageMatkul(u, old.matkulId))) back(to, "err", DENIED);
    const [nw] = await db
      .update(s.tugas)
      .set({ matkulId, judul, deskripsi: deskripsi || null, deadline })
      .where(eq(s.tugas.id, id))
      .returning();
    await audit(u, "UPDATE", "tugas", id, old, nw);
  } else {
    const [nw] = await db
      .insert(s.tugas)
      .values({ matkulId, judul, deskripsi: deskripsi || null, deadline, dibuatOleh: u.id })
      .returning();
    await audit(u, "INSERT", "tugas", nw.id, null, nw);
  }
  revalidatePath("/", "layout");
  back(to, "ok", "Tugas disimpan.");
}

export async function deleteTugas(fd: FormData) {
  const u = await requireUser();
  const to = safePath(str(fd, "returnTo"), "/tugas");
  const id = int(fd, "id");
  if (!id) back(to, "err", "Permintaan tidak valid.");
  const [old] = await db.select().from(s.tugas).where(eq(s.tugas.id, id));
  if (!old || !(await canManageMatkul(u, old.matkulId))) back(to, "err", DENIED);
  await db.delete(s.tugasStatus).where(eq(s.tugasStatus.tugasId, id));
  await db.delete(s.tugas).where(eq(s.tugas.id, id));
  await audit(u, "DELETE", "tugas", id, old, null);
  revalidatePath("/", "layout");
  back(to, "ok", "Tugas dihapus.");
}

/* ───────── jadwal ───────── */

export async function saveJadwal(fd: FormData) {
  const u = await requireUser();
  const to = safePath(str(fd, "returnTo"), "/jadwal");
  const id = int(fd, "id");
  const matkulId = int(fd, "matkulId");
  const hari = str(fd, "hari") || null;
  const tanggal = str(fd, "tanggal") || null;
  const mulai = str(fd, "mulai");
  const selesai = str(fd, "selesai");
  const ruangan = str(fd, "ruangan") || null;
  const isReschedule = fd.get("isReschedule") === "on";
  const catatan = str(fd, "catatan") || null;
  if (!matkulId || !/^\d{2}:\d{2}/.test(mulai) || !/^\d{2}:\d{2}/.test(selesai))
    back(to, "err", "Mata kuliah, jam mulai, dan jam selesai wajib diisi.");
  if (selesai <= mulai) back(to, "err", "Jam selesai harus lebih akhir daripada jam mulai.");
  if (tanggal && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) back(to, "err", "Format tanggal tidak valid.");
  if (!hari && !tanggal) back(to, "err", "Isi hari atau tanggal spesifik.");
  if (!(await canManageMatkul(u, matkulId))) back(to, "err", DENIED);
  if (id) {
    const [old] = await db.select().from(s.jadwal).where(eq(s.jadwal.id, id));
    if (!old || !(await canManageMatkul(u, old.matkulId))) back(to, "err", DENIED);
    const [nw] = await db
      .update(s.jadwal)
      .set({ matkulId, hari, tanggalSpesifik: tanggal, jamMulai: mulai, jamSelesai: selesai, ruangan, isReschedule, catatan, updatedBy: u.id, updatedAt: new Date() })
      .where(eq(s.jadwal.id, id))
      .returning();
    await audit(u, "UPDATE", "jadwal", id, old, nw);
  } else {
    const [nw] = await db
      .insert(s.jadwal)
      .values({ matkulId, hari, tanggalSpesifik: tanggal, jamMulai: mulai, jamSelesai: selesai, ruangan, isReschedule, catatan, updatedBy: u.id })
      .returning();
    await audit(u, "INSERT", "jadwal", nw.id, null, nw);
  }
  revalidatePath("/", "layout");
  back(to, "ok", "Jadwal disimpan.");
}

/* ───────── absensi ───────── */

export async function createPertemuan(fd: FormData) {
  const u = await requireUser();
  const matkulId = int(fd, "matkulId");
  const tanggal = str(fd, "tanggal");
  const to = safePath(str(fd, "returnTo"), "/absensi");
  if (!matkulId || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) back(to, "err", "Tanggal pertemuan wajib diisi.");
  if (!(await canManageMatkul(u, matkulId))) back(to, "err", DENIED);
  const [m] = await db
    .select({ n: max(s.pertemuan.pertemuanKe) })
    .from(s.pertemuan)
    .where(eq(s.pertemuan.matkulId, matkulId));
  const [nw] = await db
    .insert(s.pertemuan)
    .values({ matkulId, tanggal, pertemuanKe: (m?.n ?? 0) + 1, inputOleh: u.id })
    .returning();
  await audit(u, "INSERT", "pertemuan", nw.id, null, nw);
  revalidatePath("/", "layout");
  back(`/absensi?matkul=${matkulId}&pertemuan=${nw.id}`, "ok", "Pertemuan dibuat.");
}

export async function saveAbsensi(fd: FormData) {
  const u = await requireUser();
  const pertemuanId = int(fd, "pertemuanId");
  const to = safePath(str(fd, "returnTo"), "/absensi");
  if (!pertemuanId) back(to, "err", "Permintaan tidak valid.");
  const [p] = await db
    .select({ id: s.pertemuan.id, matkulId: s.pertemuan.matkulId, kelasId: s.matkul.kelasId })
    .from(s.pertemuan)
    .innerJoin(s.matkul, eq(s.matkul.id, s.pertemuan.matkulId))
    .where(eq(s.pertemuan.id, pertemuanId));
  if (!p || !(await canManageMatkul(u, p.matkulId))) back(to, "err", DENIED);
  // Hanya mahasiswa dari kelas matkul yang bisa diubah.
  const students = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.kelasId, p.kelasId));
  const allowed = ["hadir", "izin", "sakit", "alpha"];
  let saved = 0;
  for (const st of students) {
    const status = str(fd, `status_${st.id}`);
    const ket = str(fd, `ket_${st.id}`) || null;
    if (!status) {
      await db.delete(s.absensi).where(and(eq(s.absensi.pertemuanId, pertemuanId), eq(s.absensi.userId, st.id)));
      continue;
    }
    if (!allowed.includes(status)) continue;
    await db
      .insert(s.absensi)
      .values({ pertemuanId, userId: st.id, status, keterangan: ket })
      .onConflictDoUpdate({
        target: [s.absensi.pertemuanId, s.absensi.userId],
        set: { status, keterangan: ket },
      });
    saved++;
  }
  await audit(u, "UPSERT", "absensi", pertemuanId, null, { pertemuanId, tersimpan: saved });
  revalidatePath("/", "layout");
  back(to, "ok", `Absensi tersimpan (${saved} mahasiswa).`);
}

/* ───────── pengumuman, pendaftaran ───────── */

export async function createPengumuman(fd: FormData) {
  const u = await requireUser();
  const to = safePath(str(fd, "returnTo"), "/dashboard");
  const judul = str(fd, "judul");
  const ringkasan = str(fd, "ringkasan");
  const kategori = (str(fd, "kategori") || "UMUM").toUpperCase().slice(0, 20);
  const kelasRaw = str(fd, "kelasId");
  const kelasId = kelasRaw === "" ? null : int(fd, "kelasId");
  if (!judul || !ringkasan) back(to, "err", "Judul dan ringkasan wajib diisi.");
  if (kelasId === null) {
    if (u.uiRole !== "superadmin") back(to, "err", DENIED);
  } else if (!canManageKelas(u, kelasId)) back(to, "err", DENIED);
  const [nw] = await db
    .insert(s.pengumuman)
    .values({ kelasId, judul, ringkasan, kategori, dibuatOleh: u.id })
    .returning();
  await audit(u, "INSERT", "pengumuman", nw.id, null, nw);
  revalidatePath("/", "layout");
  back(to, "ok", "Pengumuman dipublikasikan.");
}

export async function deletePengumuman(fd: FormData) {
  const u = await requireUser();
  const to = safePath(str(fd, "returnTo"), "/dashboard");
  const id = int(fd, "id");
  if (!id) back(to, "err", "Permintaan tidak valid.");
  const [old] = await db.select().from(s.pengumuman).where(eq(s.pengumuman.id, id));
  const ok = old && (old.kelasId ? canManageKelas(u, old.kelasId) : u.uiRole === "superadmin");
  if (!ok) back(to, "err", DENIED);
  await db.delete(s.pengumuman).where(eq(s.pengumuman.id, id));
  await audit(u, "DELETE", "pengumuman", id, old, null);
  revalidatePath("/", "layout");
  back(to, "ok", "Pengumuman dihapus.");
}

export async function reviewPendaftaran(fd: FormData) {
  const u = await requireUser();
  const to = safePath(str(fd, "returnTo"), "/pendaftaran");
  const id = int(fd, "id");
  const decision = str(fd, "decision");
  if (!id || !["approved", "rejected"].includes(decision)) back(to, "err", "Permintaan tidak valid.");
  const [old] = await db.select().from(s.pendaftaranMahasiswa).where(eq(s.pendaftaranMahasiswa.id, id));
  if (!old || !canManageKelas(u, old.kelasId)) back(to, "err", DENIED);
  const [nw] = await db
    .update(s.pendaftaranMahasiswa)
    .set({ status: decision, reviewedBy: u.id, reviewedAt: new Date() })
    .where(eq(s.pendaftaranMahasiswa.id, id))
    .returning();
  await audit(u, "REVIEW", "pendaftaran_mahasiswa", id, old, nw);
  revalidatePath("/", "layout");
  back(to, "ok", decision === "approved" ? "Pendaftaran disetujui." : "Pendaftaran ditolak.");
}

/* ───────── superadmin ───────── */

export async function saveKalender(fd: FormData) {
  const u = await requireSuperadmin();
  const to = safePath(str(fd, "returnTo"), "/kalender");
  const tanggal = str(fd, "tanggal");
  const judul = str(fd, "judul");
  const kategori = (str(fd, "kategori") || "AKADEMIK").toUpperCase().slice(0, 20);
  const keterangan = str(fd, "keterangan") || null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || !judul) back(to, "err", "Tanggal dan judul wajib diisi.");
  const [nw] = await db.insert(s.kalenderAkademik).values({ tanggal, judul, kategori, keterangan }).returning();
  await audit(u, "INSERT", "kalender_akademik", nw.id, null, nw);
  revalidatePath("/", "layout");
  back(to, "ok", "Agenda ditambahkan.");
}

export async function deleteKalender(fd: FormData) {
  const u = await requireSuperadmin();
  const to = safePath(str(fd, "returnTo"), "/kalender");
  const id = int(fd, "id");
  if (!id) back(to, "err", "Permintaan tidak valid.");
  const [old] = await db.select().from(s.kalenderAkademik).where(eq(s.kalenderAkademik.id, id));
  await db.delete(s.kalenderAkademik).where(eq(s.kalenderAkademik.id, id));
  await audit(u, "DELETE", "kalender_akademik", id, old, null);
  revalidatePath("/", "layout");
  back(to, "ok", "Agenda dihapus.");
}

export async function grantRole(fd: FormData) {
  const u = await requireSuperadmin();
  const to = "/sistem";
  const userId = int(fd, "userId");
  const role = str(fd, "role");
  const matkulId = int(fd, "matkulId");
  if (!userId || !["ketua_kelas", "pj_matkul", "superadmin"].includes(role)) back(to, "err", "Permintaan tidak valid.");
  const [target] = await db.select().from(s.users).where(eq(s.users.id, userId));
  if (!target) back(to, "err", "Pengguna tidak ditemukan.");
  if (role !== "superadmin" && !target.kelasId) back(to, "err", "Pengguna belum memiliki kelas.");
  if (role === "pj_matkul") {
    if (!matkulId) back(to, "err", "Pilih mata kuliah untuk PJ matkul.");
    const [m] = await db.select().from(s.matkul).where(eq(s.matkul.id, matkulId));
    if (!m || m.kelasId !== target.kelasId) back(to, "err", "Mata kuliah harus berada di kelas pengguna.");
  }
  const exists = await db
    .select()
    .from(s.userRoles)
    .where(and(eq(s.userRoles.userId, userId), eq(s.userRoles.role, role)));
  if (exists.some((e) => (role === "pj_matkul" ? e.matkulId === matkulId : true))) back(to, "err", "Role sudah dimiliki.");
  const [nw] = await db
    .insert(s.userRoles)
    .values({ userId, role, matkulId: role === "pj_matkul" ? matkulId : null })
    .returning();
  await audit(u, "GRANT_ROLE", "user_roles", nw.id, null, nw);
  revalidatePath("/", "layout");
  back(to, "ok", "Role diberikan.");
}

export async function revokeRole(fd: FormData) {
  const u = await requireSuperadmin();
  const to = "/sistem";
  const id = int(fd, "id");
  if (!id) back(to, "err", "Permintaan tidak valid.");
  const [old] = await db.select().from(s.userRoles).where(eq(s.userRoles.id, id));
  if (!old) back(to, "err", "Role tidak ditemukan.");
  if (old.role === "superadmin" && old.userId === u.id) back(to, "err", "Tidak dapat mencabut role superadmin milik sendiri.");
  await db.delete(s.userRoles).where(eq(s.userRoles.id, id));
  await audit(u, "REVOKE_ROLE", "user_roles", id, old, null);
  revalidatePath("/", "layout");
  back(to, "ok", "Role dicabut.");
}

export async function createKelas(fd: FormData) {
  const u = await requireSuperadmin();
  const to = "/sistem";
  const nama = str(fd, "nama").toUpperCase().slice(0, 10);
  const angkatan = int(fd, "angkatan");
  if (!nama || !angkatan || angkatan < 2000 || angkatan > 2100) back(to, "err", "Nama kelas dan angkatan (2000–2100) wajib diisi.");
  const [nw] = await db.insert(s.kelas).values({ nama, angkatan }).returning();
  await audit(u, "INSERT", "kelas", nw.id, null, nw);
  revalidatePath("/", "layout");
  back(to, "ok", "Kelas ditambahkan.");
}

export async function currentUserOrNull() {
  return getSession();
}
