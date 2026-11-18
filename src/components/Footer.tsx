import Link from "next/link";
import { getSession, roleLabel } from "@/lib/auth";
import { getKetuaKelas } from "@/lib/data";
import { PRODI } from "@/lib/config";
import { Logo } from "@/components/Icons";

const link = "block py-1 text-ui text-fg2 hover:text-accent";

export async function Footer() {
  const u = await getSession();
  const ketua = u?.kelasId ? await getKetuaKelas(u.kelasId) : null;
  return (
    <footer className="mt-auto">
      <div className="grid grid-cols-1 gap-y-6 border-b border-line px-[26px] py-6 max-sm:px-[14px] min-[360px]:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="col-span-1 pr-6 min-[360px]:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-accent">
            <Logo size={20} />
            <span className="font-display text-lg font-extrabold uppercase leading-none text-fg">{PRODI.short}</span>
          </div>
          <p className="mono mt-3 text-ui leading-relaxed text-fg2">
            {PRODI.name}
            <br />
            {PRODI.faculty}
            <br />
            {PRODI.university}
          </p>
          <p className="meta mt-3 normal-case">© {new Date().getFullYear()} · Hak penggunaan: internal program studi.</p>
        </div>
        <div>
          <div className="sec-title mb-2">Navigation</div>
          <Link href="/dashboard" className={link}>Dashboard</Link>
          <Link href="/absensi" className={link}>Absensi</Link>
          <Link href="/tugas" className={link}>Tugas</Link>
          <Link href="/jadwal" className={link}>Jadwal</Link>
          <Link href="/kalender" className={link}>Kalender</Link>
        </div>
        <div>
          <div className="sec-title mb-2">Academic Resources</div>
          <Link href="/kalender" className={link}>Academic Calendar</Link>
          <Link href="/jadwal" className={link}>Course Schedule</Link>
          <Link href="/kelas" className={link}>Class Info</Link>
          <span className="block py-0.5 text-ui text-fg2 opacity-60">Academic Guide — belum dirilis</span>
          <span className="block py-0.5 text-ui text-fg2 opacity-60">Help / FAQ — belum dirilis</span>
        </div>
        <div className="col-span-1 min-[360px]:col-span-2 lg:col-span-1">
          <div className="sec-title mb-2">Class Info</div>
          {u ? (
            u.kelasId ? (
              <dl className="mono space-y-0.5 text-ui">
                <div className="flex gap-2"><dt className="w-20 text-fg2">KELAS</dt><dd>{u.kelasNama}</dd></div>
                <div className="flex gap-2"><dt className="w-20 text-fg2">ANGKATAN</dt><dd>{u.angkatan}</dd></div>
                <div className="flex gap-2"><dt className="w-20 text-fg2">KETUA</dt><dd className="min-w-0 break-words">{ketua ? ketua.nama : "—"}</dd></div>
                <div className="flex gap-2"><dt className="w-20 text-fg2">KONTAK</dt><dd className="min-w-0 break-all normal-case">{ketua ? ketua.email : "—"}</dd></div>
              </dl>
            ) : (
              <p className="mono text-ui text-fg2">AKUN TANPA KELAS ({roleLabel(u)})</p>
            )
          ) : (
            <p className="mono text-ui text-fg2">LOGIN UNTUK MELIHAT INFORMASI KELAS</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-1 px-[26px] py-2 text-caption mono uppercase tracking-wider max-sm:px-[14px] md:grid-cols-3">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="text-accent">●</span>
          SESI: {u ? `AKTIF · ${roleLabel(u)}` : "TAMU"}
        </span>
        <span className="text-fg2 md:text-center">
          {"> ACADEMIC PORTAL READY"}<span className="cursor-blink" />
        </span>
        <span className="text-fg2 md:text-right">SYS: PORTAL · NODE: PROGRAM_STUDY</span>
      </div>
    </footer>
  );
}
