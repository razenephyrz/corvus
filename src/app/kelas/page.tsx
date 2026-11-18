import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser, resolveScope } from "@/lib/auth";
import { getKelasList, getKelasStats, getKetuaKelas, getMatkulByKelas } from "@/lib/data";
import { pct } from "@/lib/format";
import { Empty, PageHead, ScopeTabs, SecHead, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function KelasPage({ searchParams }: { searchParams: Promise<{ kelas?: string }> }) {
  const u = await requireUser();
  const sp = await searchParams;
  const scope = resolveScope(u, sp.kelas);
  const kelasList = u.uiRole === "superadmin" ? await getKelasList() : [];

  if (!scope || scope < 0) {
    return (
      <>
        <PageHead idx="/KELAS · CLASS INFO" title="Class Info" desc="Informasi kelas dan program studi." />
        <div className="sec">
          {u.uiRole === "superadmin" ? (
            <>
              <ScopeTabs base="/kelas" kelas={kelasList} current={null} />
              <Empty>Pilih kelas untuk melihat detail.</Empty>
            </>
          ) : (
            <Empty>Akun Anda belum terdaftar pada kelas mana pun.</Empty>
          )}
        </div>
      </>
    );
  }

  const [matkul, ketua, stats] = await Promise.all([getMatkulByKelas(scope), getKetuaKelas(scope), getKelasStats(scope)]);
  const k = kelasList.find((x) => x.id === scope);
  const st = stats[0];
  const isStaff = u.uiRole !== "user";
  const students = isStaff
    ? await db.select({ nama: users.nama, nim: users.nim, email: users.email }).from(users).where(eq(users.kelasId, scope)).orderBy(asc(users.nama))
    : [];
  const nama = k?.nama ?? u.kelasNama;
  const angkatan = k?.angkatan ?? u.angkatan;

  return (
    <>
      <PageHead idx="/KELAS · CLASS INFO" title={`Kelas ${nama}`} desc={`Angkatan ${angkatan}`} />
      <div className="sec">
        {u.uiRole === "superadmin" && <ScopeTabs base="/kelas" kelas={kelasList} current={scope} />}
        <div className="mb-5 grid grid-cols-2 border border-line md:grid-cols-4 [&>div]:border-b [&>div]:border-line md:[&>div]:border-b-0">
          <Stat label="ANGKATAN" value={angkatan ?? "—"} />
          <Stat label="MATKUL" value={matkul.length} />
          <Stat label="KETUA KELAS" value={<span className="text-card-title">{ketua?.nama ?? "—"}</span>} sub={ketua?.email} />
          {isStaff ? (
            <Stat label="KEHADIRAN KELAS" value={st && pct(st.absensiHadir, st.absensiTotal) !== null ? `${pct(st.absensiHadir, st.absensiTotal)}%` : "N/A"} sub={`${st?.mahasiswa ?? 0} mahasiswa`} />
          ) : (
            <Stat label="KONTAK" value={<span className="text-body break-all normal-case">{ketua?.email ?? "—"}</span>} />
          )}
        </div>

        <SecHead idx="/C1" title="Mata Kuliah" />
        {matkul.length === 0 ? (
          <Empty>Belum ada mata kuliah.</Empty>
        ) : (
          <div className="tbl-wrap mb-5">
            <table className="tbl">
              <thead><tr><th>Mata kuliah</th><th>Dosen</th></tr></thead>
              <tbody>
                {matkul.map((m) => (
                  <tr key={m.id}><td className="font-semibold">{m.nama}</td><td className="text-fg2">{m.dosen ?? "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isStaff && (
          <>
            <SecHead idx="/C2" title="Daftar Mahasiswa (khusus pengelola)" />
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th>Nama</th><th>NIM</th><th>Email</th></tr></thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.email}><td>{s.nama}</td><td className="mono">{s.nim ?? "—"}</td><td className="mono normal-case text-fg2">{s.email}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
