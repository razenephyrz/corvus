import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, users } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { getKelasList, getKelasStats, getPengumuman } from "@/lib/data";
import { fmtDateTime, pct } from "@/lib/format";
import { AnnouncementManager } from "@/components/AnnouncementManager";
import { Bar, PageHead, PermissionBox, SecHead, Stat } from "@/components/ui";

export async function SuperDash({ user }: { user: SessionUser }) {
  const [stats, kelas, news, logs] = await Promise.all([
    getKelasStats(null),
    getKelasList(),
    getPengumuman("all", 20),
    db
      .select({ id: auditLog.id, aksi: auditLog.aksi, tabel: auditLog.tabel, at: auditLog.createdAt, nama: users.nama })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.userId))
      .orderBy(desc(auditLog.createdAt))
      .limit(8),
  ]);
  const tot = stats.reduce(
    (a, k) => ({
      mhs: a.mhs + k.mahasiswa,
      mk: a.mk + k.matkul,
      tg: a.tg + k.tugas,
      ah: a.ah + k.absensiHadir,
      at: a.at + k.absensiTotal,
      ts: a.ts + k.tugasSelesai,
      tl: a.tl + k.tugasSlot,
      pd: a.pd + k.pendaftaranPending,
    }),
    { mhs: 0, mk: 0, tg: 0, ah: 0, at: 0, ts: 0, tl: 0, pd: 0 },
  );
  const hadir = pct(tot.ah, tot.at);
  const selesai = pct(tot.ts, tot.tl);

  return (
    <>
      <PageHead
        idx="/D3 · DASHBOARD SUPERADMIN"
        title="System Overview"
        desc={`${user.nama} · statistik menyeluruh seluruh kelas`}
        right={
          <>
            <Link href="/sistem" className="btn btn-primary btn-sm group">SYSTEM ADMIN <span className="arrow">↗</span></Link>
            <Link href="/kalender" className="btn btn-sm group">MANAGE CALENDAR <span className="arrow">↗</span></Link>
            <Link href="/pendaftaran" className="btn btn-sm group">REGISTRATIONS <span className="arrow">↗</span></Link>
          </>
        }
      />
      <div className="sec">
        <PermissionBox
          scope="SEMUA KELAS · TINGKAT SISTEM"
          can={["Edit jadwal, absensi, tugas di semua kelas", "Kelola role, kelas, kalender akademik, pengumuman", "Melihat statistik & audit log"]}
          cannot={["Mencabut role superadmin milik sendiri", "Mengubah/menghapus entri audit log"]}
        />
      </div>

      <div className="grid grid-cols-2 border-b border-line md:grid-cols-3 lg:grid-cols-6 [&>div]:border-b [&>div]:border-line lg:[&>div]:border-b-0">
        <Stat label="KELAS" value={stats.length} />
        <Stat label="MAHASISWA" value={tot.mhs} />
        <Stat label="MATKUL" value={tot.mk} />
        <Stat label="TUGAS" value={tot.tg} />
        <Stat label="KEHADIRAN GLOBAL" value={hadir === null ? "N/A" : `${hadir}%`} sub={`${tot.ah}/${tot.at} catatan`} />
        <Stat label="TUGAS SELESAI" value={selesai === null ? "N/A" : `${selesai}%`} sub={`${tot.ts}/${tot.tl}`} />
      </div>

      <section className="sec">
        <SecHead idx="/D3.1" title="Statistik Per Kelas" />
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Kelas</th><th>Mhs</th><th>Matkul</th><th>Tugas</th><th>Kehadiran</th><th>Tugas selesai</th><th>Pendaftaran</th><th>Kelola</th></tr>
            </thead>
            <tbody>
              {stats.map((k) => {
                const h = pct(k.absensiHadir, k.absensiTotal);
                const t = pct(k.tugasSelesai, k.tugasSlot);
                return (
                  <tr key={k.id}>
                    <td className="font-semibold">KELAS {k.nama} <span className="meta">&apos;{String(k.angkatan).slice(2)}</span></td>
                    <td className="mono">{k.mahasiswa}</td>
                    <td className="mono">{k.matkul}</td>
                    <td className="mono">{k.tugas}</td>
                    <td className="min-w-[120px]"><div className="mono mb-1 text-ui">{h === null ? "N/A" : `${h}%`}</div><Bar value={h} label={`Kehadiran kelas ${k.nama}`} /></td>
                    <td className="min-w-[120px]"><div className="mono mb-1 text-ui">{t === null ? "N/A" : `${t}%`}</div><Bar value={t} label={`Tugas selesai kelas ${k.nama}`} /></td>
                    <td className="mono">{k.pendaftaranPending} pending</td>
                    <td className="space-x-1 whitespace-nowrap">
                      <Link className="btn btn-sm" href={`/jadwal?kelas=${k.id}`}>JADWAL</Link>
                      <Link className="btn btn-sm" href={`/tugas?kelas=${k.id}`}>TUGAS</Link>
                      <Link className="btn btn-sm" href={`/kelas?kelas=${k.id}`}>INFO</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sec">
        <SecHead idx="/D3.2" title="Audit Log Terbaru" right={<Link href="/sistem" className="btn btn-sm group">FULL LOG <span className="arrow">↗</span></Link>} />
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Tabel</th></tr></thead>
            <tbody>
              {logs.length === 0 && <tr><td colSpan={4} className="text-center text-fg2">Belum ada aktivitas tercatat.</td></tr>}
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="mono whitespace-nowrap">{fmtDateTime(l.at)}</td>
                  <td>{l.nama ?? "—"}</td>
                  <td><span className="tag tag-mid">{l.aksi}</span></td>
                  <td className="mono">{l.tabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AnnouncementManager
        idx="/D3.3"
        items={news}
        kelasOptions={kelas.map((k) => ({ id: k.id, nama: k.nama }))}
        allowGlobal
        manageable
      />
    </>
  );
}
