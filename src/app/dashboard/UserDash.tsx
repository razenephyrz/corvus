import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import {
  getAbsensiUser,
  getNextClass,
  getPengumuman,
  getTugasUser,
  getUpcomingEvents,
  summarizeAbsensi,
} from "@/lib/data";
import { fmtDateTime, fmtShort, fmtTime } from "@/lib/format";
import { AnnouncementManager } from "@/components/AnnouncementManager";
import { Bar, Empty, PageHead, PermissionBox, SecHead, Stat, StatusTag } from "@/components/ui";

export async function UserDash({ user }: { user: SessionUser }) {
  const kelasId = user.kelasId;
  const [absRows, tugasRows, next, events, news] = await Promise.all([
    kelasId ? getAbsensiUser(user.id, kelasId) : [],
    kelasId ? getTugasUser(user.id, kelasId) : [],
    getNextClass(kelasId),
    getUpcomingEvents(3),
    getPengumuman(kelasId, 5),
  ]);
  const abs = summarizeAbsensi(absRows);
  const open = tugasRows.filter((t) => t.status !== "selesai");
  const doneN = tugasRows.length - open.length;

  return (
    <>
      <PageHead
        idx="/D1 · DASHBOARD MAHASISWA"
        title={user.nama}
        desc={`NIM ${user.nim ?? "—"} · Kelas ${user.kelasNama ?? "—"} · Angkatan ${user.angkatan ?? "—"}`}
        right={<span className="tag tag-mid">ROLE: USER · VIEW-ONLY</span>}
      />

      <div className="sec">
        <PermissionBox
          scope={`KELAS ${user.kelasNama ?? "—"} · DATA PRIBADI`}
          can={["Melihat jadwal, absensi pribadi, tugas, kalender", "Mengubah STATUS tugas milik sendiri"]}
          cannot={["Mengedit jadwal, absensi, atau tugas", "Melihat data mahasiswa lain", "Mengubah role / akses panel admin"]}
        />
      </div>

      <div className="grid grid-cols-2 border-b border-line md:grid-cols-4 [&>div]:border-b [&>div]:border-line md:[&>div]:border-b-0">
        <Stat label="KEHADIRAN" value={abs.persen === null ? "N/A" : `${abs.persen}%`} sub={`${abs.hadir} hadir / ${abs.tercatat} tercatat`} />
        <Stat label="TUGAS BELUM SELESAI" value={open.length} sub={`${doneN} selesai dari ${tugasRows.length}`} />
        <Stat
          label="KELAS BERIKUTNYA"
          value={next ? fmtTime(next.mulai) : "—"}
          sub={next ? `${next.hari ?? fmtShort(next.tanggal)} · ${next.matkul}` : "Belum ada jadwal"}
        />
        <Stat label="AGENDA AKADEMIK" value={events.length} sub="mendatang (maks. 3 ditampilkan)" />
      </div>

      <div className="grid border-b border-line lg:grid-cols-2">
        <section className="sec !border-b-0 border-line lg:border-r">
          <SecHead
            idx="/D1.1"
            title="Tugas Saya"
            right={<Link href="/tugas" className="btn btn-sm group">OPEN TASKS <span className="arrow">↗</span></Link>}
          />
          {tugasRows.length === 0 ? (
            <Empty>Belum ada tugas untuk kelas Anda.</Empty>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Tugas</th><th>Matkul</th><th>Deadline</th><th>Status</th></tr></thead>
                <tbody>
                  {tugasRows.slice(0, 6).map((t) => (
                    <tr key={t.id}>
                      <td className="font-semibold">{t.judul}</td>
                      <td className="text-fg2">{t.matkul}</td>
                      <td className="mono whitespace-nowrap">{fmtDateTime(t.deadline)}</td>
                      <td><StatusTag kind="tugas" value={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="sec !border-b-0">
          <SecHead
            idx="/D1.2"
            title="Absensi Terbaru"
            right={<Link href="/absensi" className="btn btn-sm group">VIEW ATTENDANCE <span className="arrow">↗</span></Link>}
          />
          {absRows.length === 0 ? (
            <Empty>Belum ada catatan absensi.</Empty>
          ) : (
            <>
              <div className="tbl-wrap mb-3">
                <table className="tbl">
                  <thead><tr><th>Matkul</th><th>Tanggal</th><th>Ke</th><th>Status</th></tr></thead>
                  <tbody>
                    {absRows.slice(0, 5).map((a) => (
                      <tr key={a.pertemuanId}>
                        <td>{a.matkul}</td>
                        <td className="mono">{fmtShort(a.tanggal)}</td>
                        <td className="mono">{String(a.ke).padStart(2, "0")}</td>
                        <td><StatusTag kind="absen" value={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="meta mb-1">HADIR ÷ PERTEMUAN TERCATAT</div>
              <Bar value={abs.persen} label="Kehadiran" />
            </>
          )}
        </section>
      </div>

      <AnnouncementManager idx="/D1.3" items={news} kelasOptions={[]} allowGlobal={false} manageable={false} />
    </>
  );
}
