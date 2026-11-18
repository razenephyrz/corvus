import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ensureSeeded } from "@/lib/seed";
import { loginAction } from "@/app/actions";
import { Flash } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  await ensureSeeded();
  if (await getSession()) redirect("/dashboard");
  const sp = await searchParams;
  return (
    <div className="grid lg:grid-cols-[1fr_1.2fr]">
      <section className="min-w-0 border-b border-line px-[26px] py-8 max-sm:px-[14px] lg:border-r">
        <div className="idx mb-2">/AUTH</div>
        <h1 className="h-display text-page-title">Login</h1>
        <p className="mt-3 mb-6 max-w-sm text-body text-fg2">
          Masuk dengan email dan kata sandi. Role Anda ditentukan oleh data otorisasi di server, bukan pilihan di browser.
        </p>
        <Flash err={sp.err} />
        <form action={loginAction} className="max-w-sm space-y-3">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" name="email" type="email" required autoComplete="username" className="field" />
          </div>
          <div>
            <label htmlFor="password" className="label">Kata sandi</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />
          </div>
          <button type="submit" className="btn btn-primary group">
            LOGIN <span className="arrow">↗</span>
          </button>
        </form>
      </section>

      <section className="min-w-0 px-[26px] py-8 max-sm:px-[14px]">
        <div className="idx mb-2">/DEMO</div>
        <h2 className="h-panel mb-1">Akun demo (data dummy)</h2>
        <p className="meta mb-4 normal-case">
          Kata sandi semua akun: <span className="mono text-accent">{DEMO_PASSWORD}</span> · klik untuk masuk langsung
        </p>
        <ul className="space-y-2">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.email}>
              <form action={loginAction}>
                <input type="hidden" name="email" value={a.email} />
                <input type="hidden" name="password" value={DEMO_PASSWORD} />
                <button type="submit" className="card group flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface">
                  <span className="min-w-0">
                    <span className="block text-ui font-bold tracking-wider">{a.label}</span>
                    <span className="mono block break-all text-ui text-fg2">{a.email}</span>
                    <span className="block text-ui text-fg2">{a.note}</span>
                  </span>
                  <span className="arrow text-accent" aria-hidden="true">↗</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
        <p className="meta mt-4 normal-case">
          Akun mahasiswa lain: citra@, dimas@, eka@, fajar@, gita@, indah@ + <span className="mono">mhs.demo</span>
        </p>
      </section>
    </div>
  );
}
