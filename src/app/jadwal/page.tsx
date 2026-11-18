import Link from "next/link";
import { manageableMatkul, requireUser, resolveScope } from "@/lib/auth";
import { getJadwal, getKelasList } from "@/lib/data";
import { HARI_KERJA, fmtShort, fmtTime, fmtDateTime } from "@/lib/format";
import { saveJadwal } from "@/app/actions";
import { Empty, Flash, PageHead, ScopeTabs } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function JadwalPage({
  searchParams,
}: {
  searchParams: Promise<{ kelas?: string; edit?: string; ok?: string; err?: string }>;
}) {
  const u = await requireUser();
  const sp = await searchParams;
  const scope = resolveScope(u, sp.kelas);
  const [rows, manageable, kelasList] = await Promise.all([
    getJadwal(scope),
    manageableMatkul(u),
    u.uiRole === "superadmin" ? getKelasList() : [],
  ]);
  const manageIds = new Set(manageable.map((m) => m.id));
  const base = "/jadwal" + (u.uiRole === "superadmin" && scope ? `?kelas=${scope}` : "");
  const sep = base.includes("?") ? "&" : "?";
  const isNew = sp.edit === "new";
  const editing = !isNew && sp.edit ? rows.find((r) => r.id === Number(sp.edit) && manageIds.has(r.matkulId)) : undefined;
  const showForm = (isNew || editing) && manageable.length > 0;
  const showKelas = u.uiRole === "superadmin" && !scope;
  const canEditAny = manageable.length > 0;

  return (
    <>
      <PageHead
        idx="/JADWAL · COURSE SCHEDULE"
        title="Jadwal Kuliah"
        desc={
          u.uiRole === "user"
            ? `Jadwal kelas ${u.kelasNama ?? "—"} · hanya lihat.`
            : u.uiRole === "admin"
              ? `Anda dapat mengedit jadwal untuk ${manageable.length} mata kuliah di kelas ${u.kelasNama}.`
              : "Superadmin: dapat mengedit jadwal semua kelas."
        }
        right={canEditAny && <Link href={`${base}${sep}edit=new`} className="btn btn-primary btn-sm group">+ ADD SCHEDULE <span className="arrow">↗</span></Link>}
      />
      <div className="sec">
        <Flash ok={sp.ok} err={sp.err} />
        {u.uiRole === "superadmin" && <ScopeTabs base="/jadwal" kelas={kelasList} current={scope} />}

        {showForm && (
          <form action={saveJadwal} className="panel mb-5 p-4" aria-label="Form jadwal">
            <input type="hidden" name="returnTo" value={base} />
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="meta mb-3 !text-accent">{editing ? `EDIT SCHEDULE #${editing.id}` : "+ NEW SCHEDULE"}</div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="col-span-2">
                <label className="label" htmlFor="matkulId">Mata kuliah</label>
                <select id="matkulId" name="matkulId" className="field" defaultValue={editing?.matkulId ?? manageable[0]?.id} required>
                  {manageable.map((m) => (
                    <option key={m.id} value={m.id}>KELAS {m.kelas} · {m.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="hari">Hari</label>
                <select id="hari" name="hari" className="field" defaultValue={editing?.hari ?? ""}>
                  <option value="">— tidak ada —</option>
                  {[...HARI_KERJA, "MINGGU"].map((h) => <option key={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="tanggal">Tanggal spesifik</label>
                <input id="tanggal" name="tanggal" type="date" className="field" defaultValue={editing?.tanggal ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="mulai">Jam mulai</label>
                <input id="mulai" name="mulai" type="time" required className="field" defaultValue={editing?.mulai.slice(0, 5) ?? "08:00"} />
              </div>
              <div>
                <label className="label" htmlFor="selesai">Jam selesai</label>
                <input id="selesai" name="selesai" type="time" required className="field" defaultValue={editing?.selesai.slice(0, 5) ?? "09:40"} />
              </div>
              <div>
                <label className="label" htmlFor="ruangan">Ruangan</label>
                <input id="ruangan" name="ruangan" className="field" defaultValue={editing?.ruangan ?? ""} />
              </div>
              <div className="flex items-end pb-1.5">
                <label className="flex cursor-pointer items-center gap-2 text-ui">
                  <input type="checkbox" name="isReschedule" defaultChecked={editing?.isReschedule} className="h-4 w-4 accent-[var(--accent)]" />
                  <span className="mono uppercase">Reschedule</span>
                </label>
              </div>
              <div className="col-span-2 md:col-span-4">
                <label className="label" htmlFor="catatan">Catatan perubahan</label>
                <input id="catatan" name="catatan" className="field" defaultValue={editing?.catatan ?? ""} />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="submit" className="btn btn-primary btn-sm">SAVE</button>
              <Link href={base} className="btn btn-sm">CANCEL</Link>
            </div>
          </form>
        )}

        {rows.length === 0 ? (
          <Empty>Belum ada jadwal yang tersedia.</Empty>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Hari</th><th>Waktu</th>{showKelas && <th>Kelas</th>}<th>Mata kuliah</th><th>Dosen</th><th>Ruang</th><th>Catatan</th>{canEditAny && <th>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="mono whitespace-nowrap font-semibold">
                      {r.hari ?? (r.tanggal ? fmtShort(r.tanggal) : "BELUM DIJADWALKAN")}
                      {r.hari && r.tanggal && <div className="meta">{fmtShort(r.tanggal)}</div>}
                    </td>
                    <td className="mono whitespace-nowrap">{fmtTime(r.mulai)}–{fmtTime(r.selesai)}</td>
                    {showKelas && <td className="mono">{r.kelas}</td>}
                    <td className="font-semibold">
                      {r.matkul}
                      {r.isReschedule && <span className="tag tag-solid ml-2">↻ RESCHEDULE</span>}
                    </td>
                    <td className="text-fg2">{r.dosen ?? "—"}</td>
                    <td className="mono">{r.ruangan ?? "—"}</td>
                    <td className="max-w-[240px] text-fg2">
                      {r.catatan ?? "—"}
                      {r.catatan && <div className="meta">UPD {fmtDateTime(r.updatedAt)}</div>}
                    </td>
                    {canEditAny && (
                      <td>
                        {manageIds.has(r.matkulId) ? (
                          <Link href={`${base}${sep}edit=${r.id}`} className="btn btn-sm">EDIT SCHEDULE</Link>
                        ) : (
                          <span className="tag tag-dash">VIEW</span>
                        )}
                      </td>
                    )}
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
