import Link from "next/link";
import { manageableMatkul, type SessionUser } from "@/lib/auth";
import { getKelasStats, getPengumuman, getTugasScope } from "@/lib/data";
import { fmtDateTime, pct } from "@/lib/format";
import { AnnouncementManager } from "@/components/AnnouncementManager";
import { Bar, Empty, PageHead, PermissionBox, SecHead, Stat } from "@/components/ui";

export async function AdminDash({ user }: { user: SessionUser }) {
  const kelasId = user.kelasId as number;
  const [stats, matkulList, tugas, news] = await Promise.all([
    getKelasStats(kelasId),
    manageableMatkul(user),
    getTugasScope(kelasId),
    getPengumuman(kelasId, 5),
  ]);
  const st = stats[0];
  const hadir = st ? pct(st.absensiHadir, st.absensiTotal) : null;
  const selesai = st ? pct(st.tugasSelesai, st.tugasSlot) : null;
  const manageIds = new Set(matkulList.map((m) => m.id));
  const kind = [user.isKetua ? "KETUA KELAS" : null, user.roles.some((r) => r.role === "pj_matkul") ? "PJ MATKUL" : null]
    .filter(Boolean)
    .join(" + ");

  return (
    <>
      <PageHead
        idx={`/D2 · DASHBOARD ADMIN · ${kind}`}
        title={`Kelas ${user.kelasNama}`}
        desc={`${user.nama} · NIM ${user.nim ?? "—"} · Angkatan ${user.angkatan}`}
        right={
          <>
            <Link href="/jadwal" className="btn btn-primary btn-sm group">EDIT SCHEDULE <span className="arrow">↗</span></Link>
            <Link href="/absensi" className="btn btn-sm group">MANAGE ATTENDANCE <span className="arrow">↗</span></Link>
            <Link href="/tugas" className="btn btn-sm group">MANAGE TASKS <span className="arrow">↗</span></Link>
            <Link href="/kelas" className="btn btn-sm group">VIEW CLASS STATUS <span className="arrow">↗</span></Link>
          </>
        }
      />

      <div className="sec">
        <PermissionBox
          scope={
            user.isKetua
              ? `KELAS ${user.kelasNama} SAJA · SEMUA MATKUL`
              : `KELAS ${user.kelasNama} · ${matkulList.map((m) => m.nama).join(", ") || "BELUM ADA MATKUL"}`
          }
          can={["Edit jadwal, absensi, dan tugas dalam cakupan", user.isKetua ? "Kelola pengumuman & pendaftaran kelas ini" : "Melihat status tugas mahasiswa di matkul Anda"]}
          cannot={["Mengedit kelas lain (ditolak di server)", "Mengubah role pengguna", "Melihat audit log & statistik seluruh kelas"]}
        />
      </div>

      <div className="grid grid-cols-2 border-b border-line md:grid-cols-3 lg:grid-cols-6 [&>div]:border-b [&>div]:border-line lg:[&>div]:border-b-0">
        <Stat label="MAHASISWA" value={st?.mahasiswa ?? 0} />
        <Stat label="MATKUL" value={st?.matkul ?? 0} sub={`${matkulList.length} dikelola`} />
        <Stat label="TUGAS" value={st?.tugas ?? 0} />
        <Stat label="KEHADIRAN KELAS" value={hadir === null ? "N/A" : `${hadir}%`} sub={`${st?.absensiHadir ?? 0}/${st?.absensiTotal ?? 0} catatan`} />
        <Stat label="TUGAS SELESAI" value={selesai === null ? "N/A" : `${selesai}%`} sub={`${st?.tugasSelesai ?? 0}/${st?.tugasSlot ?? 0}`} />
        <Stat label="PENDAFTARAN" value={st?.pendaftaranPending ?? 0} sub="menunggu review" />
      </div>

      <div className="grid border-b border-line lg:grid-cols-[1fr_1.3fr]">
        <section className="sec !border-b-0 lg:border-r">
          <SecHead idx="/D2.1" title="Mata Kuliah Dalam Wewenang" />
          {matkulList.length === 0 ? (
            <Empty>Belum ada mata kuliah yang diberikan kepada akun ini.</Empty>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Matkul</th><th>Aksi</th></tr></thead>
                <tbody>
                  {matkulList.map((m) => (
                    <tr key={m.id}>
                      <td className="font-semibold">{m.nama}</td>
                      <td className="space-x-1 whitespace-nowrap">
                        <Link className="btn btn-sm" href="/jadwal">JADWAL</Link>
                        <Link className="btn btn-sm" href={`/absensi?matkul=${m.id}`}>ABSEN</Link>
                        <Link className="btn btn-sm" href="/tugas">TUGAS</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="sec !border-b-0">
          <SecHead idx="/D2.2" title="Rekap Tugas Kelas" />
          {tugas.length === 0 ? (
            <Empty>Belum ada tugas.</Empty>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Tugas</th><th>Deadline</th><th>Selesai</th><th>Hak</th></tr></thead>
                <tbody>
                  {tugas.map((t) => (
                    <tr key={t.id}>
                      <td><div className="font-semibold">{t.judul}</div><div className="meta">{t.matkul}</div></td>
                      <td className="mono whitespace-nowrap">{fmtDateTime(t.deadline)}</td>
                      <td className="min-w-[110px]">
                        <div className="mono mb-1 text-ui">{t.selesai}/{t.total}</div>
                        <Bar value={pct(t.selesai, t.total)} label={`Penyelesaian ${t.judul}`} />
                      </td>
                      <td>{manageIds.has(t.matkulId) ? <span className="tag tag-solid">EDIT</span> : <span className="tag tag-dash">VIEW</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <AnnouncementManager
        idx="/D2.3"
        items={news}
        kelasOptions={[{ id: kelasId, nama: user.kelasNama ?? "" }]}
        allowGlobal={false}
        manageable={user.isKetua}
      />
      <p className="meta px-[26px] pb-4 max-sm:px-[14px]">TERAKHIR DIMUAT {fmtDateTime(new Date())} WIB</p>
    </>
  );
}
