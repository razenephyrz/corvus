import { createPengumuman, deletePengumuman } from "@/app/actions";
import { fmtDateTime } from "@/lib/format";
import { Empty, SecHead } from "@/components/ui";

type Item = { id: number; judul: string; ringkasan: string; kategori: string; createdAt: Date; kelasId: number | null };

/** Form + daftar pengumuman. Otorisasi final tetap di server action. */
export function AnnouncementManager({
  items,
  kelasOptions,
  allowGlobal,
  manageable,
  idx,
}: {
  items: Item[];
  kelasOptions: { id: number; nama: string }[];
  allowGlobal: boolean;
  manageable: boolean;
  idx: string;
}) {
  return (
    <section id="pengumuman" className="sec">
      <SecHead idx={idx} title="Pengumuman" />
      <div className={`grid gap-4 ${manageable ? "lg:grid-cols-[1.2fr_1fr]" : ""}`}>
        <div className="space-y-2">
          {items.length === 0 && <Empty>Belum ada pengumuman.</Empty>}
          {items.map((n) => (
            <article key={n.id} className="panel flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <div className="meta">
                  {n.kategori} · {fmtDateTime(n.createdAt)} · {n.kelasId ? "KELAS" : "SEMUA KELAS"}
                </div>
                <h3 className="text-card-title font-semibold">{n.judul}</h3>
                <p className="text-ui text-fg2">{n.ringkasan}</p>
              </div>
              {manageable && (
                <form action={deletePengumuman}>
                  <input type="hidden" name="id" value={n.id} />
                  <input type="hidden" name="returnTo" value="/dashboard" />
                  <button className="btn btn-sm btn-danger" aria-label={`Hapus pengumuman ${n.judul}`}>HAPUS</button>
                </form>
              )}
            </article>
          ))}
        </div>
        {manageable && (
          <form action={createPengumuman} className="panel space-y-2 p-3">
            <input type="hidden" name="returnTo" value="/dashboard" />
            <div className="meta !text-accent">+ PENGUMUMAN BARU</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor="pk">Tujuan</label>
                <select id="pk" name="kelasId" className="field" defaultValue={kelasOptions[0]?.id ?? ""}>
                  {allowGlobal && <option value="">SEMUA KELAS</option>}
                  {kelasOptions.map((k) => (
                    <option key={k.id} value={k.id}>KELAS {k.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="pkat">Kategori</label>
                <input id="pkat" name="kategori" className="field" placeholder="AKADEMIK" maxLength={20} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="pj">Judul</label>
              <input id="pj" name="judul" required className="field" />
            </div>
            <div>
              <label className="label" htmlFor="pr">Ringkasan</label>
              <textarea id="pr" name="ringkasan" required className="field" />
            </div>
            <button className="btn btn-primary btn-sm">PUBLIKASIKAN</button>
          </form>
        )}
      </div>
    </section>
  );
}
