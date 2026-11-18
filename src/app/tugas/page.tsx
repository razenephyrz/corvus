import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tugasStatus, users } from "@/db/schema";
import { manageableMatkul, requireUser, resolveScope } from "@/lib/auth";
import { getKelasList, getTugasScope, getTugasUser } from "@/lib/data";
import { fmtDateTime, pct, toInputDateTime } from "@/lib/format";
import { deleteTugas, saveTugas, updateTugasStatus } from "@/app/actions";
import { Bar, Empty, Flash, PageHead, ScopeTabs, SecHead, StatusTag } from "@/components/ui";

export const dynamic = "force-dynamic";

const OPTIONS = [
  { v: "belum", l: "BELUM" },
  { v: "progress", l: "PROGRESS" },
  { v: "selesai", l: "SELESAI" },
];

export default async function TugasPage({
  searchParams,
}: {
  searchParams: Promise<{ kelas?: string; edit?: string; view?: string; ok?: string; err?: string }>;
}) {
  const u = await requireUser();
  const sp = await searchParams;
  const isStaff = u.uiRole !== "user";
  const scope = resolveScope(u, sp.kelas);
  const base = "/tugas" + (u.uiRole === "superadmin" && scope ? `?kelas=${scope}` : "");
  const sep = base.includes("?") ? "&" : "?";

  const [mine, scoped, manageable, kelasList] = await Promise.all([
    u.kelasId ? getTugasUser(u.id, u.kelasId) : [],
    isStaff ? getTugasScope(scope) : [],
    manageableMatkul(u),
    u.uiRole === "superadmin" ? getKelasList() : [],
  ]);
  const manageIds = new Set(manageable.map((m) => m.id));
  const now = new Date();

  const isNew = sp.edit === "new";
  const editing = !isNew && sp.edit ? scoped.find((t) => t.id === Number(sp.edit) && manageIds.has(t.matkulId)) : undefined;
  const showForm = (isNew || editing) && manageable.length > 0;
  const viewing = sp.view ? scoped.find((t) => t.id === Number(sp.view) && manageIds.has(t.matkulId)) : undefined;
  const viewRows = viewing
    ? await db
        .select({ nama: users.nama, nim: users.nim, status: tugasStatus.status, at: tugasStatus.updatedAt })
        .from(users)
        .leftJoin(tugasStatus, and(eq(tugasStatus.userId, users.id), eq(tugasStatus.tugasId, viewing.id)))
        .where(eq(users.kelasId, viewing.kelasId))
        .orderBy(asc(users.nama))
    : [];

  return (
    <>
      <PageHead
        idx="/TUGAS · TASK TRACKER"
        title="Tugas"
        desc={
          u.uiRole === "user"
            ? "Pantau deadline dan perbarui status pengerjaan milik Anda sendiri."
            : "Status pribadi Anda ada di bagian atas; pengelolaan tugas sesuai kewenangan ada di bawah."
        }
      />
      <div className="sec">
        <Flash ok={sp.ok} err={sp.err} />

        {u.kelasId && (
          <>
            <SecHead idx="/T1" title="Tugas Saya" />
            {mine.length === 0 ? (
              <Empty>Belum ada tugas untuk kelas Anda.</Empty>
            ) : (
              <div className="tbl-wrap mb-2">
                <table className="tbl">
                  <thead><tr><th>Tugas</th><th>Matkul</th><th>Deadline</th><th>Status</th><th>Ubah status saya</th></tr></thead>
                  <tbody>
                    {mine.map((t) => {
                      const cur = t.status ?? "belum";
                      const late = t.deadline < now && cur !== "selesai";
                      return (
                        <tr key={t.id}>
                          <td className="max-w-[260px]">
                            <div className="font-semibold">{t.judul}</div>
                            {t.deskripsi && <div className="line-clamp-2 text-ui text-fg2">{t.deskripsi}</div>}
                          </td>
                          <td className="text-fg2">{t.matkul}</td>
                          <td className="mono whitespace-nowrap">
                            {fmtDateTime(t.deadline)}
                            {late && <div><span className="tag tag-inv">! LEWAT</span></div>}
                          </td>
                          <td>
                            <StatusTag kind="tugas" value={t.status} />
                            {t.statusAt && <div className="meta mt-1">UPD {fmtDateTime(t.statusAt)}</div>}
                          </td>
                          <td>
                            <div className="flex gap-1">
                              {OPTIONS.map((o) => (
                                <form key={o.v} action={updateTugasStatus}>
                                  <input type="hidden" name="tugasId" value={t.id} />
                                  <input type="hidden" name="status" value={o.v} />
                                  <input type="hidden" name="returnTo" value={base} />
                                  <button className={`btn btn-sm ${cur === o.v ? "btn-on" : ""}`} aria-pressed={cur === o.v}>{o.l}</button>
                                </form>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="meta mb-6">Tidak ada pengumpulan berkas pada sistem ini — status hanya penanda pengerjaan, bukan penilaian dosen.</p>
          </>
        )}

        {isStaff && (
          <>
            <div className="mb-3 mt-2 border-t border-line pt-5" />
            <SecHead
              idx="/T2"
              title={u.uiRole === "superadmin" ? "Kelola Tugas · Semua Kelas" : `Kelola Tugas · Kelas ${u.kelasNama}`}
              right={manageable.length > 0 && <Link href={`${base}${sep}edit=new`} className="btn btn-primary btn-sm group">+ NEW TASK <span className="arrow">↗</span></Link>}
            />
            {u.uiRole === "superadmin" && <ScopeTabs base="/tugas" kelas={kelasList} current={scope} />}

            {showForm && (
              <form action={saveTugas} className="panel mb-4 p-4" aria-label="Form tugas">
                <input type="hidden" name="returnTo" value={base} />
                {editing && <input type="hidden" name="id" value={editing.id} />}
                <div className="meta mb-3 !text-accent">{editing ? `EDIT TASK #${editing.id}` : "+ NEW TASK"}</div>
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
                  <div>
                    <label className="label" htmlFor="matkulId">Mata kuliah</label>
                    <select id="matkulId" name="matkulId" className="field" defaultValue={editing?.matkulId ?? manageable[0]?.id} required>
                      {manageable.map((m) => <option key={m.id} value={m.id}>KELAS {m.kelas} · {m.nama}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="judul">Judul tugas</label>
                    <input id="judul" name="judul" required className="field" defaultValue={editing?.judul ?? ""} />
                  </div>
                  <div>
                    <label className="label" htmlFor="deadline">Deadline (WIB)</label>
                    <input id="deadline" name="deadline" type="datetime-local" required className="field" defaultValue={editing ? toInputDateTime(editing.deadline) : ""} />
                  </div>
                  <div className="md:col-span-3">
                    <label className="label" htmlFor="deskripsi">Deskripsi</label>
                    <textarea id="deskripsi" name="deskripsi" className="field" defaultValue={editing?.deskripsi ?? ""} />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="btn btn-primary btn-sm">SAVE</button>
                  <Link href={base} className="btn btn-sm">CANCEL</Link>
                </div>
              </form>
            )}

            {scoped.length === 0 ? (
              <Empty>Belum ada tugas untuk mata kuliah ini.</Empty>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead><tr><th>Tugas</th>{u.uiRole === "superadmin" && <th>Kelas</th>}<th>Matkul</th><th>Deadline</th><th>Penyelesaian</th><th>Aksi</th></tr></thead>
                  <tbody>
                    {scoped.map((t) => {
                      const can = manageIds.has(t.matkulId);
                      return (
                        <tr key={t.id}>
                          <td className="font-semibold">{t.judul}</td>
                          {u.uiRole === "superadmin" && <td className="mono">{t.kelas}</td>}
                          <td className="text-fg2">{t.matkul}</td>
                          <td className="mono whitespace-nowrap">{fmtDateTime(t.deadline)}</td>
                          <td className="min-w-[150px]">
                            <div className="mono mb-1 text-ui">● {t.selesai} · ◐ {t.progress} · ○ {t.belum}</div>
                            <Bar value={pct(t.selesai, t.total)} label={`Penyelesaian ${t.judul}`} />
                          </td>
                          <td>
                            {can ? (
                              <div className="flex flex-wrap gap-1">
                                <Link className="btn btn-sm" href={`${base}${sep}view=${t.id}`}>STATUS</Link>
                                <Link className="btn btn-sm" href={`${base}${sep}edit=${t.id}`}>EDIT</Link>
                                <form action={deleteTugas}>
                                  <input type="hidden" name="id" value={t.id} />
                                  <input type="hidden" name="returnTo" value={base} />
                                  <button className="btn btn-sm btn-danger">HAPUS</button>
                                </form>
                              </div>
                            ) : (
                              <span className="tag tag-dash">VIEW</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {viewing && (
              <div className="mt-4">
                <div className="meta mb-2 !text-accent">STATUS MAHASISWA · {viewing.judul} · KELAS {viewing.kelas}</div>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead><tr><th>Mahasiswa</th><th>NIM</th><th>Status</th><th>Diubah</th></tr></thead>
                    <tbody>
                      {viewRows.map((r, i) => (
                        <tr key={i}>
                          <td>{r.nama}</td>
                          <td className="mono">{r.nim ?? "—"}</td>
                          <td><StatusTag kind="tugas" value={r.status} /></td>
                          <td className="mono">{r.at ? fmtDateTime(r.at) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
