import Link from "next/link";
import { getSession, roleLabel, type SessionUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { PRODI } from "@/lib/config";
import { Logo } from "@/components/Icons";
import { Clock, NavLinks } from "@/components/HeaderClient";

function navFor(u: SessionUser | null) {
  const base = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/absensi", label: "Absensi" },
    { href: "/tugas", label: "Tugas" },
    { href: "/jadwal", label: "Jadwal" },
    { href: "/kalender", label: "Kalender" },
  ];
  if (!u) return [];
  if (u.uiRole === "admin") base.push({ href: "/pendaftaran", label: "Pendaftaran" });
  if (u.uiRole === "superadmin") {
    base.push({ href: "/pendaftaran", label: "Pendaftaran" }, { href: "/sistem", label: "Sistem" });
  }
  return base;
}

function ctaFor(u: SessionUser | null) {
  if (!u) return { href: "/login", label: "LOGIN" };
  if (u.uiRole === "superadmin") return { href: "/sistem", label: "SYSTEM ADMIN" };
  if (u.uiRole === "admin") return { href: "/dashboard", label: "MANAGE CLASS" };
  return { href: "/jadwal", label: "VIEW SCHEDULE" };
}

export async function Header() {
  const u = await getSession();
  const nav = navFor(u);
  const cta = ctaFor(u);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg">
      <div className="flex h-14 items-stretch">
        <Link href="/" className="flex items-center gap-2.5 border-r border-line px-2 text-accent sm:px-5" aria-label={`${PRODI.short} — beranda`}>
          <Logo />
          <span className="font-display text-lg font-extrabold uppercase leading-none tracking-wide text-fg sm:text-xl">
            {PRODI.short}
          </span>
        </Link>
        <NavLinks items={nav} />
        <div className="flex-1" />
        <Clock />
        <div className="hidden items-center border-l border-line px-2 sm:px-4 min-[360px]:flex">
          <Link href={cta.href} className="btn btn-primary group !px-2 !py-2 sm:!px-3">
            {cta.label} <span className="arrow">↗</span>
          </Link>
        </div>
        <details className="relative border-l border-line">
          <summary
            className="flex h-full w-11 items-center justify-center text-base hover:text-accent lg:w-12"
            aria-label="Menu"
          >
            <span aria-hidden="true">⋮</span>
          </summary>
          <div className="absolute right-0 top-full z-40 w-[min(280px,100vw)] border border-line bg-bg">
            {u ? (
              <div className="border-b border-line p-3">
                <div className="text-ui font-semibold">{u.nama}</div>
                <div className="meta mt-0.5 normal-case">{u.email}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="tag tag-mid">{roleLabel(u)}</span>
                  {u.kelasNama && <span className="tag">KELAS {u.kelasNama}</span>}
                </div>
              </div>
            ) : (
              <div className="border-b border-line p-3 meta">BELUM LOGIN</div>
            )}
            <div className="lg:hidden">
              {nav.map((i) => (
                <Link key={i.href} href={i.href} className="block border-b border-line px-3 py-2.5 text-ui font-semibold uppercase tracking-[0.08em] hover:bg-surface2 hover:text-accent">
                  {i.label}
                </Link>
              ))}
            </div>
            <Link href="/kelas" className="block border-b border-line px-3 py-2.5 text-ui font-semibold uppercase tracking-[0.08em] hover:bg-surface2 hover:text-accent">
              Class Info
            </Link>
            {u ? (
              <form action={logoutAction}>
                <button type="submit" className="w-full px-3 py-2.5 text-left text-ui font-semibold uppercase tracking-[0.08em] hover:bg-surface2 hover:text-accent">
                  Logout →
                </button>
              </form>
            ) : (
              <Link href="/login" className="block px-3 py-2.5 text-ui font-semibold uppercase tracking-[0.08em] hover:bg-surface2 hover:text-accent">
                Login →
              </Link>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}
