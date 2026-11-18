import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getKalender } from "@/lib/data";
import { MONTHS_LONG, addDays, fmtFull, todayStr } from "@/lib/format";
import { deleteKalender, saveKalender } from "@/app/actions";
import { Empty, Flash, PageHead, SecHead } from "@/components/ui";

export const dynamic = "force-dynamic";

function monthShift(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; d?: string; ok?: string; err?: string }>;
}) {
  const u = await requireUser();
  const sp = await searchParams;
  const today = todayStr();
  const ym = /^\d{4}-\d{2}$/.test(sp.m ?? "") ? (sp.m as string) : today.slice(0, 7);
  const sel = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? (sp.d as string) : null;

  const [y, mo] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, mo - 1, 1));
  const daysIn = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Senin pertama
  const events = await getKalender(`${ym}-01`, `${ym}-${String(daysIn).padStart(2, "0")}`);
  const upcoming = (await getKalender(today, addDays(today, 120))).slice(0, 6);
  const byDate = new Map<string, typeof events>();
  for (const e of events) byDate.set(e.tanggal, [...(byDate.get(e.tanggal) ?? []), e]);
  const selEvents = sel ? await getKalender(sel, sel) : [];
  const isSuper = u.uiRole === "superadmin";
  const ret = `/kalender?m=${ym}${sel ? `&d=${sel}` : ""}`;

  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <>
      <PageHead
        idx="/KALENDER · ACADEMIC CALENDAR"
        title="Kalender Akademik"
        desc="Tanggal penting akademik dari tabel kalender akademik. Terpisah dari jadwal perkuliahan mingguan."
      />
      <div className="sec">
        <Flash ok={sp.ok} err={sp.err} />
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <section aria-label="Kalender bulanan">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="h-panel">{MONTHS_LONG[mo - 1]} {y}</h2>
              <div className="flex gap-1">
                <Link href={`/kalender?m=${monthShift(ym, -1)}`} className="btn btn-sm" aria-label="Bulan sebelumnya">◀ PREV</Link>
                <Link href="/kalender" className="btn btn-sm">TODAY</Link>
                <Link href={`/kalender?m=${monthShift(ym, 1)}`} className="btn btn-sm" aria-label="Bulan berikutnya">NEXT ▶</Link>
              </div>
            </div>
            <div className="grid grid-cols-7 border-l border-t border-line">
              {["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"].map((d) => (
                <div key={d} className="meta border-b border-r border-line bg-surface px-2 py-1">{d}</div>
              ))}
              {cells.map((d, i) => {
                if (!d) return <div key={i} className="min-h-[56px] border-b border-r border-line bg-surface/40 max-sm:min-h-[44px]" />;
                const ds = `${ym}-${String(d).padStart(2, "0")}`;
                const ev = byDate.get(ds);
                const isSel = ds === sel;
                const isToday = ds === today;
                return (
                  <Link
                    key={i}
                    href={`/kalender?m=${ym}&d=${ds}`}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={`${fmtFull(ds)}${ev ? `, ${ev.length} agenda` : ""}`}
                    className={`relative min-h-[56px] border-b border-r border-line p-1.5 transition-colors hover:bg-surface2 max-sm:min-h-[44px] ${isSel ? "bg-surface2 outline outline-1 -outline-offset-1 outline-accent" : ""}`}
                  >
                    <span className={`mono text-caption ${isToday ? "bg-accent px-1 font-bold text-bg" : "text-fg2"}`}>{String(d).padStart(2, "0")}</span>
                    {ev && (
                      <span className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1 mono text-caption text-accent">
                        <span aria-hidden="true">■</span>
                        <span className="max-sm:hidden">{ev.length} AGENDA</span>
                        <span className="sm:hidden">{ev.length}</span>
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
            <p className="meta mt-2">■ = ada agenda · kotak terisi = hari ini</p>
          </section>

          <aside className="space-y-5">
            <section>
              <SecHead idx="/K1" title={sel ? `Agenda ${fmtFull(sel)}` : "Agenda Tanggal Terpilih"} />
              {!sel ? (
                <Empty>Pilih tanggal pada kalender.</Empty>
              ) : selEvents.length === 0 ? (
                <Empty>Belum ada agenda kalender untuk tanggal ini.</Empty>
              ) : (
                <ul className="space-y-2">
                  {selEvents.map((e) => (
                    <li key={e.id} className="panel flex items-start justify-between gap-2 p-3">
                      <div>
                        <span className="tag tag-mid">{e.kategori}</span>
                        <div className="mt-1 text-ui font-semibold">{e.judul}</div>
                        {e.keterangan && <div className="text-ui text-fg2">{e.keterangan}</div>}
                      </div>
                      {isSuper && (
                        <form action={deleteKalender}>
                          <input type="hidden" name="id" value={e.id} />
                          <input type="hidden" name="returnTo" value={ret} />
                          <button className="btn btn-sm btn-danger">HAPUS</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <SecHead idx="/K2" title="Agenda Terdekat" />
              {upcoming.length === 0 ? (
                <Empty>Belum ada agenda mendatang.</Empty>
              ) : (
                <ul className="divide-y divide-[var(--line-soft)] border border-line">
                  {upcoming.map((e) => (
                    <li key={e.id}>
                      <Link href={`/kalender?m=${e.tanggal.slice(0, 7)}&d=${e.tanggal}`} className="group flex items-center justify-between gap-2 px-3 py-2 hover:bg-surface">
                        <span className="min-w-0">
                          <span className="block truncate text-ui font-semibold">{e.judul}</span>
                          <span className="meta">{e.kategori}</span>
                        </span>
                        <span className="mono shrink-0 text-ui text-accent">{fmtFull(e.tanggal)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {isSuper && (
              <form action={saveKalender} className="panel space-y-2 p-3">
                <input type="hidden" name="returnTo" value={ret} />
                <div className="meta !text-accent">+ AGENDA AKADEMIK (SUPERADMIN)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label" htmlFor="kt">Tanggal</label>
                    <input id="kt" name="tanggal" type="date" required defaultValue={sel ?? today} className="field" />
                  </div>
                  <div>
                    <label className="label" htmlFor="kk">Kategori</label>
                    <input id="kk" name="kategori" placeholder="UJIAN" maxLength={20} className="field" />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="kj">Judul</label>
                  <input id="kj" name="judul" required className="field" />
                </div>
                <div>
                  <label className="label" htmlFor="kn">Keterangan</label>
                  <input id="kn" name="keterangan" className="field" />
                </div>
                <button className="btn btn-primary btn-sm">TAMBAH AGENDA</button>
              </form>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
