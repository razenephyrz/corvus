/* Visual SVG statis (tanpa JS) — dekoratif, disembunyikan dari assistive technology. */

export function HeroVisual() {
  // Pelat isometrik 200×200 (lokal) → layar
  const iso = (y: number) => `translate(300 ${y}) matrix(0.866 0.5 -0.866 0.5 0 0)`;
  const gridLines = [];
  for (let i = 0; i <= 5; i++) {
    gridLines.push(<path key={`h${i}`} d={`M0 ${i * 40}H200`} />);
    gridLines.push(<path key={`v${i}`} d={`M${i * 40} 0V200`} />);
  }
  return (
    <svg
      viewBox="0 0 560 340"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id="hg" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" className="stroke-soft" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="560" height="340" fill="url(#hg)" opacity="0.7" />

      {/* garis vertikal penghubung antar-lapisan */}
      <g className="stroke-line" strokeWidth="0.8" strokeDasharray="3 3" fill="none">
        <path d="M127 200V132M473 200V132M300 300V232M127 132V64M473 132V64M300 232V164" />
      </g>

      {/* lapisan atas — hanya kerangka */}
      <g transform={iso(32)} fill="none" className="stroke-fg2" strokeWidth="0.9" strokeDasharray="4 3">
        <rect width="200" height="200" />
      </g>
      {/* lapisan tengah — garis jadwal */}
      <g transform={iso(66)} fill="none" className="stroke-accent" strokeWidth="0.9">
        <rect width="200" height="200" />
        <path d="M0 40H200M0 100H200M0 160H200" className="stroke-line" />
        <path d="M30 0V200M110 0V200" className="stroke-line" />
      </g>
      {/* lapisan bawah — peta jadwal */}
      <g transform={iso(100)}>
        <rect width="200" height="200" className="fill-surface2" opacity="0.8" />
        <g className="stroke-line" strokeWidth="0.8" fill="none">
          {gridLines}
        </g>
        <rect x="0" y="0" width="80" height="40" className="fill-accent" />
        <rect x="80" y="40" width="40" height="80" className="fill-fg" />
        <rect x="120" y="120" width="80" height="40" className="fill-line" />
        <rect x="40" y="160" width="40" height="40" className="fill-accent" opacity="0.6" />
        <rect x="160" y="0" width="40" height="40" className="fill-fg2" opacity="0.7" />
        <rect x="0" y="80" width="40" height="40" className="fill-none stroke-accent" strokeWidth="1.2" />
        <rect x="0" y="0" width="200" height="200" className="fill-none stroke-fg" strokeWidth="1.2" />
      </g>

      {/* crosshair */}
      <g className="stroke-accent" strokeWidth="1" fill="none">
        <path d="M44 56h16M52 48v16" />
        <circle cx="52" cy="56" r="6" />
        <path d="M500 284h16M508 276v16" />
        <circle cx="508" cy="284" r="6" />
      </g>
      {/* kurung sudut */}
      <g className="stroke-fg" strokeWidth="1.2" fill="none">
        <path d="M12 28V12h16M548 28V12h-16M12 312v16h16M548 312v16h-16" />
      </g>

      {/* HUD */}
      <g className="mono fill-fg2" fontSize="9" letterSpacing="0.6">
        <text x="30" y="34" className="fill-accent">{"> ACADEMIC_GRID"}</text>
        <text x="30" y="46">{"> VIEW_MODE: TRACKING"}</text>
        <text x="30" y="318" className="fill-fg">{"//ACADEMIC_01"}</text>
        <text x="530" y="34" textAnchor="end">REV.01</text>
        <text x="530" y="318" textAnchor="end">[ SCHEDULE_MAP ]</text>
        <text x="22" y="200" className="fill-fg2" transform="rotate(-90 22 200)" textAnchor="middle">
          TIMELINE / WEEK
        </text>
      </g>
      <g className="stroke-fg2" strokeWidth="0.8">
        {Array.from({ length: 12 }).map((_, i) => (
          <path key={i} d={`M12 ${100 + i * 12}h${i % 4 === 0 ? 10 : 5}`} />
        ))}
      </g>
    </svg>
  );
}

const frame = {
  viewBox: "0 0 320 180",
  className: "block h-full w-full",
  preserveAspectRatio: "xMidYMid slice" as const,
  "aria-hidden": true,
  focusable: false,
};

export function ThumbAttendance() {
  const pattern = "hhihhxhhshhhhihxhhhhsh h";
  const cells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 7; c++) {
      const ch = pattern[(r * 7 + c) % pattern.length];
      const x = 24 + c * 40;
      const y = 40 + r * 31;
      cells.push(
        <g key={`${r}-${c}`}>
          <rect x={x} y={y} width="32" height="24" className="fill-none stroke-line" strokeWidth="1" />
          {ch === "h" && <rect x={x + 8} y={y + 6} width="16" height="12" className="fill-accent" />}
          {ch === "i" && <rect x={x + 8} y={y + 6} width="16" height="12" className="fill-none stroke-accent" strokeWidth="1.2" />}
          {ch === "s" && <path d={`M${x + 8} ${y + 18}L${x + 24} ${y + 6}`} className="stroke-fg2" strokeWidth="1.2" />}
          {ch === "x" && <path d={`M${x + 9} ${y + 6}L${x + 23} ${y + 18}M${x + 23} ${y + 6}L${x + 9} ${y + 18}`} className="stroke-fg" strokeWidth="1.2" />}
        </g>,
      );
    }
  }
  return (
    <svg {...frame}>
      <rect width="320" height="180" className="fill-surface" />
      <g className="mono fill-fg2" fontSize="8">
        {["S", "S", "R", "K", "J", "S", "M"].map((d, i) => (
          <text key={i} x={36 + i * 40} y="30" textAnchor="middle">{d}</text>
        ))}
        <text x="24" y="14" className="fill-accent">/ATTENDANCE_GRID</text>
      </g>
      {cells}
      <path d="M24 170H296" className="stroke-line" strokeWidth="1" />
    </svg>
  );
}

export function ThumbTasks() {
  const rows = [
    { w: 120, p: 100 },
    { w: 150, p: 55 },
    { w: 100, p: 20 },
    { w: 135, p: 75 },
  ];
  return (
    <svg {...frame}>
      <rect width="320" height="180" className="fill-surface" />
      <text x="20" y="18" className="mono fill-accent" fontSize="8">/TASK_TIMELINE</text>
      {rows.map((r, i) => (
        <g key={i} transform={`translate(20 ${30 + i * 33})`}>
          <rect width="12" height="12" className="fill-none stroke-fg2" strokeWidth="1" />
          {r.p === 100 && <path d="M2 6l3 3 5-6" className="stroke-accent fill-none" strokeWidth="1.5" />}
          <rect x="22" y="1" width={r.w} height="4" className="fill-fg" opacity="0.85" />
          <rect x="22" y="9" width={r.w * 0.6} height="3" className="fill-fg2" opacity="0.5" />
          <rect x="200" y="4" width="90" height="4" className="fill-surface2" />
          <rect x="200" y="4" width={(90 * r.p) / 100} height="4" className="fill-accent" />
          <path d="M260 -4v-6" className="stroke-line" />
        </g>
      ))}
      <path d="M200 164H290" className="stroke-line" />
      <path d="M200 160v8M245 160v8M290 160v8" className="stroke-line" />
    </svg>
  );
}

export function ThumbSchedule() {
  const blocks = [
    [0, 0, 1], [1, 2, 2], [2, 1, 1], [3, 0, 2], [4, 3, 1], [0, 3, 1], [2, 4, 1],
  ];
  return (
    <svg {...frame}>
      <rect width="320" height="180" className="fill-surface" />
      <text x="20" y="16" className="mono fill-accent" fontSize="8">/TIMETABLE</text>
      <g className="stroke-line" strokeWidth="0.8" fill="none">
        {Array.from({ length: 6 }).map((_, c) => <path key={c} d={`M${40 + c * 52} 26V168`} />)}
        {Array.from({ length: 6 }).map((_, r) => <path key={r} d={`M40 ${26 + r * 28.4}H300`} />)}
      </g>
      <g className="mono fill-fg2" fontSize="7">
        {["SEN", "SEL", "RAB", "KAM", "JUM"].map((d, i) => (
          <text key={d} x={66 + i * 52} y="24" textAnchor="middle">{d}</text>
        ))}
        {["08", "10", "13", "15"].map((h, i) => (
          <text key={h} x="34" y={46 + i * 28.4} textAnchor="end">{h}</text>
        ))}
      </g>
      {blocks.map(([c, r, l], i) => (
        <g key={i}>
          <rect x={42 + c * 52} y={28 + r * 28.4} width="48" height={28 * l + (l - 1) * 0.4} className={i % 3 === 0 ? "fill-accent" : i % 3 === 1 ? "fill-fg" : "fill-line"} />
          <rect x={46 + c * 52} y={33 + r * 28.4} width="20" height="2" className="fill-bg" opacity="0.6" />
        </g>
      ))}
    </svg>
  );
}

export function ThumbCalendar() {
  const marks = new Set([3, 9, 10, 17, 24]);
  const cells = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 7; c++) {
      const n = r * 7 + c;
      const x = 28 + c * 38;
      const y = 34 + r * 27;
      cells.push(
        <g key={n}>
          <rect x={x} y={y} width="34" height="23" className="fill-none stroke-line" strokeWidth="0.8" />
          <text x={x + 4} y={y + 10} className="mono fill-fg2" fontSize="7">{String(n + 1).padStart(2, "0")}</text>
          {marks.has(n) && <circle cx={x + 25} cy={y + 14} r="4" className="fill-accent" />}
        </g>,
      );
    }
  }
  return (
    <svg {...frame}>
      <rect width="320" height="180" className="fill-surface" />
      <text x="28" y="22" className="mono fill-accent" fontSize="8">/MONTH_GRID</text>
      <text x="292" y="22" textAnchor="end" className="mono fill-fg2" fontSize="8">◀ ▶</text>
      {cells}
    </svg>
  );
}
