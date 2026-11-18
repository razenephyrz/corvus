import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { kelas, pendaftaranMahasiswa as pm } from "@/db/schema";
import { canManageKelas, requireAdmin } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { reviewPendaftaran } from "@/app/actions";
import { Empty, Flash, PageHead } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PendaftaranPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const u = await requireAdmin();
  const sp = await searchParams;
  const q = db
    .select({
      id: pm.id, nama: pm.nama, nim: pm.nim, email: pm.email, status: pm.status,
      createdAt: pm.createdAt, reviewedAt: pm.reviewedAt, kelasId: pm.kelasId, kelas: kelas.nama,
    })
    .from(pm)
    .innerJoin(kelas, eq(kelas.id, pm.kelasId));
  const rows = await (u.uiRole === "superadmin" ? q : q.where(eq(pm.kelasId, u.kelasId ?? -1))).orderBy(desc(pm.createdAt));

  return (
    <>
      <PageHead
        idx="/PENDAFTARAN · REGISTRATION REVIEW"
        title="Pendaftaran"
        desc={u.uiRole === "superadmin" ? "Semua kelas." : `Kelas ${u.kelasNama}. Review hanya oleh ketua kelas atau superadmin.`}
      />
      <div className="sec">
        <Flash ok={sp.ok} err={sp.err} />
        {rows.length === 0 ? (
          <Empty>Belum ada pendaftaran.</Empty>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Nama</th><th>NIM</th><th>Email</th><th>Kelas</th><th>Diajukan</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.nama}</td>
                    <td className="mono">{r.nim}</td>
                    <td className="mono normal-case text-fg2">{r.email}</td>
                    <td className="mono">{r.kelas}</td>
                    <td className="mono whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                    <td>
                      <span className={`tag ${r.status === "approved" ? "tag-solid" : r.status === "rejected" ? "tag-inv" : "tag-dash"}`}>
                        {r.status === "approved" ? "● DISETUJUI" : r.status === "rejected" ? "✕ DITOLAK" : "○ PENDING"}
                      </span>
                    </td>
                    <td>
                      {r.status === "pending" && canManageKelas(u, r.kelasId) ? (
                        <div className="flex gap-1">
                          {(["approved", "rejected"] as const).map((d) => (
                            <form key={d} action={reviewPendaftaran}>
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="decision" value={d} />
                              <input type="hidden" name="returnTo" value="/pendaftaran" />
                              <button className={`btn btn-sm ${d === "approved" ? "btn-primary" : ""}`}>{d === "approved" ? "APPROVE" : "REJECT"}</button>
                            </form>
                          ))}
                        </div>
                      ) : (
                        <span className="tag tag-dash">{r.status === "pending" ? "VIEW" : "SELESAI"}</span>
                      )}
                    </td>
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
