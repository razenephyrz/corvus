"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="hidden h-full items-stretch lg:flex">
      {items.map((i) => {
        const active = path === i.href || path.startsWith(i.href + "/");
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center border-r border-line px-4 text-ui font-semibold uppercase tracking-[0.08em] transition-colors hover:text-accent ${active ? "bg-surface2 text-accent" : ""}`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Clock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const f = () =>
      setT(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date()),
      );
    f();
    const id = setInterval(f, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hidden flex-col justify-center border-l border-line px-4 xl:flex" aria-label="Waktu sistem">
      <span className="meta leading-none">SYS.TIME</span>
      <span className="mono mt-1 text-ui leading-none" suppressHydrationWarning>
        {t || "--:--:--"} <span className="text-fg2">UTC+7</span>
      </span>
    </div>
  );
}
