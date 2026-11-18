import Link from "next/link";
import type { ReactNode } from "react";
import { ABSEN_LABEL, TUGAS_LABEL } from "@/lib/format";

export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return (
    <div
      role={err ? "alert" : "status"}
      className={`mb-4 flex items-center gap-2 border px-3 py-2 text-ui mono ${err ? "border-dashed border-fg text-fg bg-surface2" : "border-accent text-accent bg-surface"}`}
    >
      <span aria-hidden="true">{err ? "✕ ERR" : "✓ OK"}</span>
      <span>{err ?? ok}</span>
    </div>
  );
}

export function PageHead({
  idx,
  title,
  desc,
  right,
}: {
  idx: string;
  title: string;
  desc?: string;
  right?: ReactNode;
}) {
  return (
    <div className="sec flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="idx mb-2">{idx}</div>
        <h1 className="h-display text-page-title">{title}</h1>
        {desc && <p className="mt-3 max-w-xl text-ui text-fg2">{desc}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

export function SecHead({ idx, title, right }: { idx: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-baseline gap-3">
        <span className="idx">{idx}</span>
        <h2 className="sec-title">{title}</h2>
      </div>
      {right}
    </div>
  );
}

const ABSEN_GLYPH: Record<string, string> = { hadir: "●", izin: "◐", sakit: "◐", alpha: "✕" };
const TUGAS_GLYPH: Record<string, string> = { selesai: "●", progress: "◐", belum: "○" };

export function StatusTag({ kind, value }: { kind: "absen" | "tugas"; value: string | null | undefined }) {
  if (kind === "absen") {
    if (!value) return <span className="tag tag-dash">┄ BELUM ADA DATA</span>;
    const cls = value === "hadir" ? "tag-solid" : value === "alpha" ? "tag-inv" : "tag-mid";
    return (
      <span className={`tag ${cls}`}>
        {ABSEN_GLYPH[value] ?? "·"} {ABSEN_LABEL[value] ?? value.toUpperCase()}
      </span>
    );
  }
  const v = value ?? "belum";
  const cls = v === "selesai" ? "tag-solid" : v === "progress" ? "tag-mid" : "";
  return (
    <span className={`tag ${cls}`}>
      {TUGAS_GLYPH[v] ?? "○"} {TUGAS_LABEL[v] ?? v.toUpperCase()}
    </span>
  );
}

export function Bar({ value, label }: { value: number | null; label?: string }) {
  const v = value ?? 0;
  return (
    <div
      className="bar"
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <i style={{ width: `${v}%` }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-line px-3 py-4 text-center text-ui text-fg2 mono">
      {children}
    </div>
  );
}

export function ScopeTabs({
  base,
  kelas,
  current,
}: {
  base: string;
  kelas: { id: number; nama: string }[];
  current: number | null;
}) {
  return (
    <nav aria-label="Filter kelas" className="mb-4 flex flex-wrap items-center gap-2">
      <span className="meta mr-1">SCOPE:</span>
      <Link href={base} className={`btn btn-sm ${current === null ? "btn-on" : ""}`}>
        SEMUA KELAS
      </Link>
      {kelas.map((k) => (
        <Link
          key={k.id}
          href={`${base}?kelas=${k.id}`}
          className={`btn btn-sm ${current === k.id ? "btn-on" : ""}`}
        >
          KELAS {k.nama}
        </Link>
      ))}
    </nav>
  );
}

/** Stat sel kecil bergaya CYBR */
export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="border-r border-line p-3 last:border-r-0">
      <div className="meta">{label}</div>
      <div className="h-display text-stat mt-1">{value}</div>
      {sub && <div className="meta mt-1 normal-case">{sub}</div>}
    </div>
  );
}

export function PermissionBox({
  can,
  cannot,
  scope,
}: {
  can: string[];
  cannot: string[];
  scope: string;
}) {
  return (
    <div className="panel grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr]">
      <div className="border-b border-line p-3 md:border-b-0 md:border-r">
        <div className="meta mb-1">SCOPE AKSES</div>
        <div className="mono text-ui text-accent">{scope}</div>
      </div>
      <div className="border-b border-line p-3 md:border-b-0 md:border-r">
        <div className="meta mb-1">✓ DAPAT</div>
        <ul className="space-y-0.5 text-ui">
          {can.map((c) => (
            <li key={c}>+ {c}</li>
          ))}
        </ul>
      </div>
      <div className="p-3">
        <div className="meta mb-1">✕ TIDAK DAPAT</div>
        <ul className="space-y-0.5 text-ui text-fg2">
          {cannot.map((c) => (
            <li key={c}>– {c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
