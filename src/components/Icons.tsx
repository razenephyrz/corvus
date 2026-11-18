type Name = "attendance" | "tasks" | "schedule" | "calendar" | "class";

export function Icon({ name, size = 22 }: { name: Name; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.3,
    "aria-hidden": true,
    focusable: false,
  } as const;
  switch (name) {
    case "attendance":
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="17" />
          <path d="M3 9h18M8 2v4M16 2v4" />
          <path d="M7 13l2 2 3-3M14 13h4M7 18h4M14 18h4" />
        </svg>
      );
    case "tasks":
      return (
        <svg {...p}>
          <path d="M5 3h10l4 4v14H5z" />
          <path d="M15 3v4h4" />
          <path d="M8 11l1.5 1.5L12 10M14 11h3M8 16l1.5 1.5L12 15M14 16h3" />
        </svg>
      );
    case "schedule":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6v6l4 2" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...p}>
          <rect x="3" y="4" width="18" height="17" />
          <path d="M3 9h18M8 2v4M16 2v4" />
          <path d="M7 12h2M11 12h2M15 12h2M7 15h2M11 15h2M15 15h2M7 18h2M11 18h2" />
        </svg>
      );
    case "class":
      return (
        <svg {...p}>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <path d="M14 14h7v7h-7zM14 17.5h7M17.5 14v7" />
        </svg>
      );
  }
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" />
      <path d="M2 12h20M12 2v20" />
      <rect x="12" y="2" width="10" height="10" fill="currentColor" stroke="none" />
    </svg>
  );
}
