type Props = React.SVGProps<SVGSVGElement>;

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconLock(props: Props) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <rect x="4" y="10.5" width="16" height="10" rx="1.5" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}

export function IconEye(props: Props) {
  return (
    <svg {...base} width={18} height={18} {...props} aria-hidden="true">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function IconEyeOff(props: Props) {
  return (
    <svg {...base} width={18} height={18} {...props} aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A9.9 9.9 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17.6 17.6 0 0 1-3.4 4.2" />
      <path d="M6.6 7.9A17.4 17.4 0 0 0 2 12s3.6 6.5 10 6.5a10 10 0 0 0 3.8-.7" />
      <path d="M9.6 9.8a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function IconAlert(props: Props) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M12 4.5 21 20H3l9-15.5Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function IconCheck(props: Props) {
  return (
    <svg {...base} width={11} height={11} strokeWidth={2.6} {...props} aria-hidden="true">
      <path d="M4 12.5 9.2 17.5 20 6.5" />
    </svg>
  );
}

export function IconShield(props: Props) {
  return (
    <svg {...base} width={14} height={14} {...props} aria-hidden="true">
      <path d="M12 3 5 5.8v5.5c0 4.3 2.9 7.8 7 9.7 4.1-1.9 7-5.4 7-9.7V5.8L12 3Z" />
    </svg>
  );
}

export function IconCapsLock(props: Props) {
  return (
    <svg {...base} width={13} height={13} {...props} aria-hidden="true">
      <path d="M12 4 5 11h3.6v4h6.8v-4H19L12 4Z" />
      <path d="M8.6 18.5h6.8" />
    </svg>
  );
}

export function IconChevron(props: Props) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
