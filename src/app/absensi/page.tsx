import Link from "next/link";
import { manageableMatkul, requireUser } from "@/lib/auth";
import { getAbsensiMatrix, getAbsensiUser, getPertemuan, summarizeAbsensi } from "@/lib/data";
import { fmtFull, todayStr } from "@/lib/format";
import { createPertemuan, saveAbsensi } from "@/app/actions";
import { Bar, Empty, Flash, PageHead, SecHead, Stat, StatusTag } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AbsensiPage({
  searchParams,
}: {
  searchParams: Promise<{ matkul?: string; pertemuan?: string; ok?: string; err?: string }>;
}) {
  const u = await requireUser();
  const sp = await searchParams;
  const [rows, manageable] = await Promise.all([
    u.kelasId ? getAbsensiUser(u.id, u.kelasId) : [],
    manageableMatkul(u),
  ]);
  const abs = summarizeAbsensi(rows);

  const sel = manageable.find((m) => m.id === Number(sp.matkul)) ?? manageable[0];
  const pertemuanList = sel ? await getPertemuan(sel.id) : [];
  const curP = pertemuanList.find((p) => p.id === Number(sp.pertemuan)) ?? pertemuanList[0];
  const matrix = sel && curP ? await getAbsensiMatrix(curP.id, sel.kelasId) : [];
  const returnTo = sel ? `/absensi?matkul=${sel.id}${curP ? `&pertemuan=${curP.id}` : ""}` : "/absensi";

  return (
    <>
      <PageHead
        idx="/ABSENSI · ATTENDANCE"
        title="Absensi"
        desc={
          u.uiRole === "user"
            ? "Riwayat kehadiran pribadi Anda. Data mahasiswa lain tidak ditampilkan."
            : "Riwayat pribadi Anda ada di atas; pengelolaan absensi sesuai kewenangan ada di bawah."
        }
      />
      <div className="sec">
        <Flash ok={sp.ok} err={sp.err} />

        {u.kelasId && (
          <>
            <SecHead idx="/A1" title="Absensi Saya" />
            <div className="mb-3 grid grid-cols-2 border border-line md:grid-cols-5 [&>div]:border-b [&>div]:border-line md:[&>div]:border-b-0">
              <Stat label="KEHADIRAN" value={abs.persen === null ? "N/A" : `${abs.persen}%`} sub="hadir ÷ tercatat" />
              <Stat label="HADIR" value={abs.hadir} />
              <Stat label="IZIN / SAKIT" value={abs.izin + abs.sakit} />
              <Stat label="ALPHA" value={abs.alpha} />
              <Stat label="BELUM DIINPUT" value={abs.kosong} sub="bukan berarti alpha" />
            </div>
            <div className="mb-3"><Bar value={abs.persen} label="Kehadiran" /></div>
            {rows.length === 0 ? (
              <Empty>Belum ada catatan absensi.</Empty>
            ) : (
              <div className="tbl-wrap mb-6">
                <table className="tbl">
                  <thead><tr><th>Mata kuliah</th><th>Tanggal</th><th>Pert.</th><th>Status</th><th>Keterangan</th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.pertemuanId}>
                        <td className="font-semibold">{r.matkul}</td>
                        <td className="mono">{fmtFull(r.tanggal)}</td>
                        <td className="mono">{String(r.ke).padStart(2, "0")}</td>
                        <td><StatusTag kind="absen" value={r.status} /></td>
                        <td className="text-fg2">{r.keterangan ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {u.uiRole !== "user" && (
          <>
            <div className="mb-3 mt-2 border-t border-line pt-5" />
            <SecHead idx="/A2" title="Kelola Absensi" />
            {!sel ? (
              <Empty>Belum ada mata kuliah yang dapat Anda kelola.</Empty>
            ) : (
              <>
                <nav aria-label="Pilih mata kuliah" className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="meta mr-1">MATKUL:</span>
                  {manageable.map((m) => (
                    <Link key={m.id} href={`/absensi?matkul=${m.id}`} className={`btn btn-sm ${m.id === sel.id ? "btn-on" : ""}`}>
                      {u.uiRole === "superadmin" ? `${m.kelas} · ` : ""}{m.nama}
                    </Link>
                  ))}
                </nav>

                <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                  <div className="space-y-3">
                    <form action={createPertemuan} className="panel space-y-2 p-3">
                      <input type="hidden" name="matkulId" value={sel.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <div className="meta !text-accent">+ PERTEMUAN BARU</div>
                      <div>
                        <label className="label" htmlFor="tgl">Tanggal</label>
                        <input id="tgl" name="tanggal" type="date" required defaultValue={todayStr()} className="field" />
                      </div>
                      <button className="btn btn-primary btn-sm">BUAT PERTEMUAN</button>
                    </form>
                    <div>
                      <div className="meta mb-1">DAFTAR PERTEMUAN</div>
                      {pertemuanList.length === 0 ? (
                        <Empty>Belum ada pertemuan.</Empty>
                      ) : (
                        <ul className="space-y-1">
                          {pertemuanList.map((p) => (
                            <li key={p.id}>
                              <Link
                                href={`/absensi?matkul=${sel.id}&pertemuan=${p.id}`}
                                className={`flex min-h-11 items-center justify-between border px-2.5 py-1.5 mono text-ui ${curP?.id === p.id ? "border-accent bg-surface2 text-accent" : "border-line hover:border-accent"}`}
                              >
                                <span>PERT. {String(p.pertemuanKe).padStart(2, "0")}</span>
                                <span>{fmtFull(p.tanggal)}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    {!curP ? (
                      <Empty>Buat pertemuan terlebih dahulu untuk mengisi absensi.</Empty>
                    ) : (
                      <form action={saveAbsensi}>
                        <input type="hidden" name="pertemuanId" value={curP.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <div className="meta mb-2 !text-accent">
                          KELAS {sel.kelas} · {sel.nama} · PERT. {String(curP.pertemuanKe).padStart(2, "0")} · {fmtFull(curP.tanggal)}
                        </div>
                        <div className="tbl-wrap">
                          <table className="tbl">
                            <thead><tr><th>Mahasiswa</th><th>NIM</th><th>Status</th><th>Keterangan</th></tr></thead>
                            <tbody>
                              {matrix.map((m) => (
                                <tr key={m.userId}>
                                  <td className="font-semibold">{m.nama}</td>
                                  <td className="mono">{m.nim ?? "—"}</td>
                                  <td>
                                    <select name={`status_${m.userId}`} defaultValue={m.status ?? ""} className="field !w-auto" aria-label={`Status ${m.nama}`}>
                                      <option value="">┄ belum diinput</option>
                                      <option value="hadir">● HADIR</option>
                                      <option value="izin">◐ IZIN</option>
                                      <option value="sakit">◐ SAKIT</option>
                                      <option value="alpha">✕ ALPHA</option>
                                    </select>
                                  </td>
                                  <td>
                                    <input name={`ket_${m.userId}`} defaultValue={m.keterangan ?? ""} className="field" aria-label={`Keterangan ${m.nama}`} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3"><button className="btn btn-primary btn-sm">SAVE ATTENDANCE</button></div>
                      </form>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
