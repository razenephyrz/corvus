import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { kelas, matkul, userRoles, users } from "@/db/schema";

/**
 * Pemetaan role (eksplisit):
 *   user_roles.role = 'superadmin'   → UI "superadmin"  (semua kelas)
 *   user_roles.role = 'ketua_kelas'  → UI "admin"       (semua matkul di kelas sendiri)
 *   user_roles.role = 'pj_matkul'    → UI "admin"       (hanya matkul_id miliknya, di kelas sendiri)
 *   tanpa baris role                 → UI "user"        (hanya lihat + ubah status tugas sendiri)
 */
export type UiRole = "user" | "admin" | "superadmin";

export type SessionUser = {
  id: number;
  nama: string;
  email: string;
  nim: string | null;
  kelasId: number | null;
  kelasNama: string | null;
  angkatan: number | null;
  roles: { role: string; matkulId: number | null }[];
  uiRole: UiRole;
  isKetua: boolean;
};

const COOKIE = "portal_sid";
const MAX_AGE = 60 * 60 * 12;
const SECRET = process.env.SESSION_SECRET ?? "portal-akademik-dev-secret-change-me";

function sign(payload: string) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(pw, salt, 32);
  const known = Buffer.from(hash, "hex");
  return known.length === test.length && crypto.timingSafeEqual(known, test);
}

export async function startSession(userId: number) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${userId}.${exp}`;
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

async function readUserId(): Promise<number | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const [id, exp, sig] = raw.split(".");
  if (!id || !exp || !sig) return null;
  const expected = sign(`${id}.${exp}`);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return Number(id);
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const uid = await readUserId();
  if (!uid) return null;
  const [row] = await db
    .select({
      id: users.id,
      nama: users.nama,
      email: users.email,
      nim: users.nim,
      kelasId: users.kelasId,
      kelasNama: kelas.nama,
      angkatan: kelas.angkatan,
    })
    .from(users)
    .leftJoin(kelas, eq(kelas.id, users.kelasId))
    .where(eq(users.id, uid));
  if (!row) return null;
  const roles = await db
    .select({ role: userRoles.role, matkulId: userRoles.matkulId })
    .from(userRoles)
    .where(eq(userRoles.userId, uid));
  const isSuper = roles.some((r) => r.role === "superadmin");
  const isKetua = roles.some((r) => r.role === "ketua_kelas");
  const isPj = roles.some((r) => r.role === "pj_matkul");
  const uiRole: UiRole = isSuper ? "superadmin" : isKetua || isPj ? "admin" : "user";
  return { ...row, roles, uiRole, isKetua };
});

export async function requireUser(): Promise<SessionUser> {
  const u = await getSession();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.uiRole === "user") redirect("/dashboard");
  return u;
}

export async function requireSuperadmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.uiRole !== "superadmin") redirect("/dashboard");
  return u;
}

/** Matkul yang boleh dikelola user (jadwal, tugas, absensi). */
export async function manageableMatkul(u: SessionUser) {
  const base = db
    .select({ id: matkul.id, nama: matkul.nama, kelasId: matkul.kelasId, kelas: kelas.nama })
    .from(matkul)
    .innerJoin(kelas, eq(kelas.id, matkul.kelasId));
  if (u.uiRole === "superadmin") return base.orderBy(kelas.nama, matkul.nama);
  if (u.uiRole === "user" || !u.kelasId) return [];
  if (u.isKetua) return base.where(eq(matkul.kelasId, u.kelasId)).orderBy(matkul.nama);
  const ids = u.roles
    .filter((r) => r.role === "pj_matkul" && r.matkulId)
    .map((r) => r.matkulId as number);
  if (!ids.length) return [];
  return base
    .where(and(eq(matkul.kelasId, u.kelasId), inArray(matkul.id, ids)))
    .orderBy(matkul.nama);
}

export async function canManageMatkul(u: SessionUser, matkulId: number): Promise<boolean> {
  if (u.uiRole === "superadmin") return true;
  if (u.uiRole === "user" || !u.kelasId) return false;
  const [m] = await db.select({ kelasId: matkul.kelasId }).from(matkul).where(eq(matkul.id, matkulId));
  if (!m || m.kelasId !== u.kelasId) return false; // kelas lain → selalu ditolak
  if (u.isKetua) return true;
  return u.roles.some((r) => r.role === "pj_matkul" && r.matkulId === matkulId);
}

/** Kelola level kelas (pengumuman, review pendaftaran): superadmin atau ketua kelas yang bersangkutan. */
export function canManageKelas(u: SessionUser, kelasId: number): boolean {
  if (u.uiRole === "superadmin") return true;
  return u.isKetua && u.kelasId === kelasId;
}

/**
 * Scope kelas untuk halaman daftar.
 * superadmin: ?kelas=ID atau null (semua). Lainnya: kelas sendiri (-1 bila tidak punya kelas).
 */
export function resolveScope(u: SessionUser, kelasParam?: string): number | null {
  if (u.uiRole === "superadmin") {
    const n = Number(kelasParam);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  return u.kelasId ?? -1;
}

export function roleLabel(u: SessionUser): string {
  if (u.uiRole === "superadmin") return "SUPERADMIN / DEVS";
  if (u.uiRole === "admin") {
    const parts = [];
    if (u.isKetua) parts.push("KETUA KELAS");
    if (u.roles.some((r) => r.role === "pj_matkul")) parts.push("PJ MATKUL");
    return parts.join(" + ");
  }
  return "MAHASISWA";
}
