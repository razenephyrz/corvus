import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, kelas, matkul, userRoles, users } from "@/db/schema";
import { requireSuperadmin } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { createKelas, grantRole, revokeRole } from "@/app/actions";
import { Empty, Flash, PageHead, SecHead } from "@/components/ui";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  superadmin: "SUPERADMIN",
  ketua_kelas: "KETUA KELAS",
  pj_matkul: "PJ MATKUL",
};

export default async function SistemPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  await requireSuperadmin();
  const sp = await searchParams;
  const [userRows, roleRows, matkulRows, kelasRows, logs] = await Promise.all([
    db
      .select({ id: users.id, nama: users.nama, email: users.email, nim: users.nim, kelas: kelas.nama })
      .from(users)
      .leftJoin(kelas, eq(kelas.id, users.kelasId))
      .orderBy(asc(kelas.nama), asc(users.nama)),
    db
      .select({ id: userRoles.id, userId: userRoles.userId, role: userRoles.role, matkul: matkul.nama })
      .from(userRoles)
      .leftJoin(matkul, eq(matkul.id, userRoles.matkulId)),
    db
      .select({ id: matkul.id, nama: matkul.nama, kelasId: matkul.kelasId, kelas: kelas.nama })
      .from(matkul)
      .innerJoin(kelas, eq(kelas.id, matkul.kelasId))
      .orderBy(asc(kelas.nama), asc(matkul.nama)),
    db.select().from(kelas).orderBy(asc(kelas.nama)),
    db
      .select({
        id: auditLog.id, aksi: auditLog.aksi, tabel: auditLog.tabel, recordId: auditLog.recordId,
        at: auditLog.createdAt, nama: users.nama,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.userId))
      .orderBy(desc(auditLog.createdAt))
      .limit(50),
  ]);

  return (
    <>
      <PageHead idx="/SISTEM · ADMINISTRATION" title="System Admin" desc="Pengguna, role, kelas, dan audit log. Khusus superadmin." />
      <div className="sec">
        <Flash ok={sp.ok} err={sp.err} />

        <SecHead idx="/S1" title="Pengguna & Role" />
        <div className="tbl-wrap mb-4">
          <table className="tbl">
            <thead><tr><th>Nama</th><th>Email</th><th>NIM</th><th>Kelas</th><th>Role</th></tr></thead>
            <tbody>
              {userRows.map((r) => (
                <tr key={r.id}>
                  <td className="font-semibold">{r.nama}</td>
                  <td className="mono normal-case text-fg2">{r.email}</td>
                  <td className="mono">{r.nim ?? "—"}</td>
                  <td className="mono">{r.kelas ?? "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {roleRows.filter((x) => x.userId === r.id).length === 0 && <span className="tag tag-dash">USER</span>}
                      {roleRows.filter((x) => x.userId === r.id).map((x) => (
                        <form key={x.id} action={revokeRole} className="inline-flex">
                          <input type="hidden" name="id" value={x.id} />
                          <button className="tag tag-mid cursor-pointer hover:border-dashed" title="Klik untuk mencabut role" aria-label={`Cabut role ${ROLE_LABEL[x.role]}`}>
                            {ROLE_LABEL[x.role] ?? x.role}{x.matkul ? ` · ${x.matkul}` : ""} ✕
                          </button>
                        </form>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <form action={grantRole} className="panel space-y-2 p-3">
            <div className="meta !text-accent">+ BERIKAN ROLE</div>
            <div>
              <label className="label" htmlFor="gu">Pengguna</label>
              <select id="gu" name="userId" className="field">
                {userRows.map((r) => <option key={r.id} value={r.id}>{r.nama} ({r.kelas ?? "tanpa kelas"})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor="gr">Role</label>
                <select id="gr" name="role" className="field">
                  <option value="ketua_kelas">KETUA KELAS (kelas sendiri)</option>
                  <option value="pj_matkul">PJ MATKUL</option>
                  <option value="superadmin">SUPERADMIN</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="gm">Matkul (PJ saja)</label>
                <select id="gm" name="matkulId" className="field">
                  <option value="">—</option>
                  {matkulRows.map((m) => <option key={m.id} value={m.id}>{m.kelas} · {m.nama}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary btn-sm">GRANT</button>
          </form>
          <form action={createKelas} className="panel space-y-2 p-3">
            <div className="meta !text-accent">+ KELAS BARU ({kelasRows.length} kelas saat ini)</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor="kn">Nama kelas</label>
                <input id="kn" name="nama" required maxLength={10} className="field" placeholder="D" />
              </div>
              <div>
                <label className="label" htmlFor="ka">Angkatan</label>
                <input id="ka" name="angkatan" type="number" required min={2000} max={2100} defaultValue={2025} className="field" />
              </div>
            </div>
            <button className="btn btn-primary btn-sm">TAMBAH KELAS</button>
          </form>
        </div>

        <SecHead idx="/S2" title="Audit Log (50 terakhir)" />
        {logs.length === 0 ? (
          <Empty>Belum ada aktivitas tercatat.</Empty>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Tabel</th><th>Record</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="mono whitespace-nowrap">{fmtDateTime(l.at)}</td>
                    <td>{l.nama ?? "—"}</td>
                    <td><span className="tag tag-mid">{l.aksi}</span></td>
                    <td className="mono">{l.tabel}</td>
                    <td className="mono">{l.recordId ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
