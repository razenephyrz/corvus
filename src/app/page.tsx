import Link from "next/link";
import { getSession } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import {
  getAbsensiUser,
  getNextClass,
  getPengumuman,
  getTugasUser,
  getUpcomingDeadlines,
  getUpcomingEvents,
  summarizeAbsensi,
} from "@/lib/data";
import { fmtDateTime, fmtShort, fmtTime } from "@/lib/format";
import { Icon } from "@/components/Icons";
import { Bar, Empty, StatusTag } from "@/components/ui";
import { HeroVisual, ThumbAttendance, ThumbCalendar, ThumbSchedule, ThumbTasks } from "@/components/Visuals";

export const dynamic = "force-dynamic";

const QUICK = [
  { icon: "attendance", title: "ATTENDANCE", desc: "Track your attendance.", href: "/absensi" },
  { icon: "tasks", title: "ASSIGNMENTS", desc: "Track deadlines and progress.", href: "/tugas" },
  { icon: "schedule", title: "SCHEDULE", desc: "View classes and room updates.", href: "/jadwal" },
  { icon: "calendar", title: "ACADEMIC CALENDAR", desc: "Track important academic dates.", href: "/kalender" },
  { icon: "class", title: "CLASS INFO", desc: "View class and program details.", href: "/kelas" },
] as const;

export default async function HomePage() {
  await ensureSeeded();
  const u = await getSession();

  const absRows = u?.kelasId ? await getAbsensiUser(u.id, u.kelasId) : [];
  const abs = summarizeAbsensi(absRows);
  const tugasRows = u?.kelasId ? await getTugasUser(u.id, u.kelasId) : [];
  const tugasOpen = tugasRows.filter((t) => t.status !== "selesai").length;
  const tugasDone = tugasRows.length - tugasOpen;
  const next = u ? await getNextClass(u.kelasId) : null;
  const events = await getUpcomingEvents(20);
  const news = await getPengumuman(u?.kelasId ?? null, 2);
  const deadlines = u ? await getUpcomingDeadlines(u, 3) : [];
  const tugasPct = tugasRows.length ? Math.round((tugasDone / tugasRows.length) * 100) : null;

  const hasKelas = !!u?.kelasId;

  return (
    <>
      {/* ───── 01 HERO ───── */}
      <section className="grid border-b border-line lg:grid-cols-[1.05fr_1fr]" aria-labelledby="hero-title">
        <div className="flex min-w-0 flex-col justify-between gap-6 px-[26px] py-[22px] max-sm:px-[14px] lg:border-r lg:border-line">
          <div className="idx">/01</div>
          <div>
            <p className="meta mb-3 !text-accent">ACADEMIC. ORGANIZED. CONNECTED.</p>
            <h1 id="hero-title" className="h-display text-hero-title">
              Academic
              <br />
              Tracking
            </h1>
            <p className="mt-4 max-w-md text-body leading-relaxed text-fg2">
              Pantau absensi, tugas, jadwal mata kuliah, dan informasi akademik program studi dalam satu tempat.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard" className="btn btn-primary group">
              OPEN DASHBOARD <span className="arrow">↗</span>
            </Link>
            <Link href="/kalender" className="btn">
              VIEW CALENDAR
            </Link>
          </div>
        </div>
        <div className="relative h-[260px] min-w-0 overflow-hidden max-lg:border-t max-lg:border-line lg:h-auto lg:min-h-[340px]">
          <HeroVisual />
        </div>
      </section>

      {/* ───── 02 QUICK ACCESS ───── */}
      <section className="border-b border-line" aria-labelledby="qa-title">
        <div className="flex items-baseline gap-3 border-b border-line px-[26px] py-2.5 max-sm:px-[14px]">
          <span className="idx">/02</span>
          <h2 id="qa-title" className="sec-title">Academic Quick Access</h2>
        </div>
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {QUICK.map((q, i) => (
            <Link
              key={q.title}
              href={q.href}
              className="group flex min-w-0 items-start gap-3 border-b border-r border-line px-[18px] py-4 transition-colors hover:bg-surface lg:border-b-0 lg:last:border-r-0 max-sm:px-3"
              style={i === QUICK.length - 1 ? undefined : undefined}
            >
              <span className="mt-0.5 shrink-0 text-accent"><Icon name={q.icon} /></span>
              <span className="min-w-0">
                <span className="block text-ui font-bold tracking-[0.08em]">{q.title}</span>
                <span className="mt-1 block text-ui leading-snug text-fg2">{q.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ───── 03 OVERVIEW ───── */}
      <section className="border-b border-line" aria-labelledby="ov-title">
        <div className="flex items-baseline gap-3 border-b border-line px-[26px] py-2.5 max-sm:px-[14px]">
          <span className="idx">/03</span>
          <h2 id="ov-title" className="sec-title">Academic Overview</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/absensi", title: "ATTENDANCE_LOG", cat: "PERSONAL TRACKING", Thumb: ThumbAttendance,
              live: hasKelas ? (abs.persen === null ? "BELUM ADA DATA ABSENSI" : `${abs.persen}% HADIR · ${abs.tercatat} PERTEMUAN TERCATAT`) : null,
            },
            {
              href: "/tugas", title: "TASK_TRACKER", cat: "DEADLINE TRACKING", Thumb: ThumbTasks,
              live: hasKelas ? `${tugasOpen} TUGAS BELUM SELESAI` : null,
            },
            {
              href: "/jadwal", title: "CLASS_SCHEDULE", cat: "TIMETABLE", Thumb: ThumbSchedule,
              live: next ? `NEXT: ${next.hari ?? fmtShort(next.tanggal)} ${fmtTime(next.mulai)} · ${next.matkul}` : null,
            },
            {
              href: "/kalender", title: "ACADEMIC_CALENDAR", cat: "IMPORTANT DATES", Thumb: ThumbCalendar,
              live: u ? `${events.length} AGENDA MENDATANG` : null,
            },
          ].map(({ href, title, cat, Thumb, live }) => (
            <Link key={title} href={href} className="group block min-w-0 border-b border-r border-line transition-colors hover:bg-surface lg:border-b-0 lg:last:border-r-0">
              <div className="aspect-video overflow-hidden border-b border-line">
                <Thumb />
              </div>
              <div className="flex items-start justify-between gap-2 px-[18px] py-3 max-sm:px-3">
                <div className="min-w-0">
                  <div className="mono text-ui font-bold tracking-wider">{title}</div>
                  <div className="meta mt-0.5">{cat}</div>
                  <div className="mono mt-2 min-h-[1.4em] text-caption uppercase text-accent">{live ?? "LOGIN UNTUK RINGKASAN"}</div>
                </div>
                <span className="arrow shrink-0 text-base text-accent" aria-hidden="true">↗</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ───── 04–06 INFORMATION PANELS ───── */}
      <section className="grid border-b border-line md:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr]" aria-label="Panel informasi">
        {/* A */}
        <div className="flex min-w-0 flex-col gap-3 border-b border-line px-[26px] py-5 max-sm:px-[14px] md:border-r lg:border-b-0">
          <div className="idx">/04</div>
          <h2 className="h-panel">Academic<br />Announcements</h2>
          <div className="flex-1 space-y-3">
            {news.length === 0 ? (
              <Empty>Belum ada pengumuman.</Empty>
            ) : (
              news.map((n) => (
                <article key={n.id} className="border-l-2 border-accent pl-3">
                  <div className="meta">
                    {n.kategori} · {fmtDateTime(n.createdAt).slice(0, 6)}
                  </div>
                  <h3 className="text-ui font-semibold leading-snug">{n.judul}</h3>
                  <p className="line-clamp-2 text-ui text-fg2">{n.ringkasan}</p>
                </article>
              ))
            )}
          </div>
          <div>
            <Link href={u ? "/dashboard#pengumuman" : "/login"} className="btn btn-sm group">
              VIEW UPDATES <span className="arrow">↗</span>
            </Link>
          </div>
        </div>

        {/* B */}
        <div className="flex min-w-0 flex-col gap-3 border-b border-line px-[26px] py-5 max-sm:px-[14px] lg:border-b-0 lg:border-r">
          <div className="idx">/05</div>
          <h2 className="h-panel">Tracking<br />Status</h2>
          {!u ? (
            <div className="flex-1"><Empty>Login untuk melihat status pribadi.</Empty></div>
          ) : !hasKelas ? (
            <div className="flex-1"><Empty>Akun tanpa kelas — tidak ada status mahasiswa.</Empty></div>
          ) : (
            <dl className="flex-1 space-y-3 mono text-ui uppercase">
              <div>
                <div className="mb-1 flex justify-between"><dt>Attendance</dt><dd>{abs.persen === null ? "N/A" : `${abs.persen}%`}</dd></div>
                <Bar value={abs.persen} label="Persentase kehadiran" />
              </div>
              <div>
                <div className="mb-1 flex justify-between"><dt>Assignments</dt><dd>{tugasRows.length ? `${tugasDone}/${tugasRows.length} SELESAI` : "N/A"}</dd></div>
                <Bar value={tugasPct} label="Tugas selesai" />
              </div>
              <div className="flex justify-between"><dt>Schedule</dt><dd className="text-accent">{next ? `${next.hari ?? fmtShort(next.tanggal)} ${fmtTime(next.mulai)}` : "BELUM ADA"}</dd></div>
              <div className="flex justify-between"><dt>Academic</dt><dd className="text-accent">{events.length} AGENDA</dd></div>
            </dl>
          )}
          <div>
            <Link href="/tugas" className="btn btn-sm group">VIEW TASKS <span className="arrow">↗</span></Link>
          </div>
        </div>

        {/* C */}
        <div className="flex min-w-0 flex-col gap-3 px-[26px] py-5 max-sm:px-[14px] md:col-span-2 md:border-t md:border-line lg:col-span-1 lg:border-t-0">
          <div className="idx">/06</div>
          <h2 className="h-panel">Upcoming<br />Deadlines</h2>
          <div className="flex-1 space-y-2">
            {!u ? (
              <Empty>Login untuk melihat deadline.</Empty>
            ) : deadlines.length === 0 ? (
              <Empty>Tidak ada deadline mendatang.</Empty>
            ) : (
              deadlines.map((d) => (
                <div key={d.id} className="flex items-start justify-between gap-3 border-b border-soft pb-2 last:border-b-0">
                  <div className="min-w-0">
                    <div className="text-ui font-semibold">{d.judul}</div>
                    <div className="meta">{d.kelas ? `KELAS ${d.kelas} · ` : ""}{d.matkul}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="mono text-caption">{fmtDateTime(d.deadline)}</div>
                    {d.status && <StatusTag kind="tugas" value={d.status} />}
                  </div>
                </div>
              ))
            )}
          </div>
          <div>
            <Link href="/tugas" className="btn btn-sm group">VIEW DETAILS <span className="arrow">↗</span></Link>
          </div>
        </div>
      </section>

      {/* ───── 07 PARTNERS ───── */}
      <section className="px-[26px] py-4 max-sm:px-[14px] border-b border-line" aria-labelledby="pt-title">
        <h2 id="pt-title" className="meta mb-3">/07 · Academic Information Partners</h2>
        {/* Placeholder logo — ganti dengan aset resmi (SVG/PNG) */}
        <ul className="flex flex-wrap items-center gap-x-10 gap-y-3 text-fg2">
          {["UNIVERSITAS [LOGO]", "FAKULTAS [LOGO]", "PRODI [LOGO]", "HIMPUNAN MAHASISWA [LOGO]", "SISTEM AKADEMIK [LOGO]"].map((p) => (
            <li key={p} className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" aria-hidden="true">
                <rect x="1" y="1" width="16" height="16" strokeDasharray="2 2" />
                <path d="M1 1l16 16M17 1L1 17" opacity="0.4" />
              </svg>
              <span className="font-display text-ui font-bold uppercase tracking-wide">{p}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
