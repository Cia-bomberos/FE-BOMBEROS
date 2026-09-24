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

export function IconTablero(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="8.5" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1" />
      <rect x="3.5" y="15" width="7" height="5.5" rx="1" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1" />
    </svg>
  );
}

export function IconBandeja(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <path d="M3.5 13.5 6 5h12l2.5 8.5" />
      <path d="M3.5 13.5h4l1 2.5h7l1-2.5h4v5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-5Z" />
    </svg>
  );
}

export function IconGrafico(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <path d="M4 19.5h16" />
      <path d="M6.5 16V10" />
      <path d="M11 16V5.5" />
      <path d="M15.5 16v-4" />
      <path d="M20 16V8" />
    </svg>
  );
}

export function IconEngranaje(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
    </svg>
  );
}

export function IconBuscar(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export function IconSalir(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <path d="M14 5.5h4.5A1.5 1.5 0 0 1 20 7v10a1.5 1.5 0 0 1-1.5 1.5H14" />
      <path d="M10 15.5 6 12l4-3.5" />
      <path d="M6 12h9" />
    </svg>
  );
}

export function IconFlecha(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <path d="M5 12h13" />
      <path d="m12.5 6 6 6-6 6" />
    </svg>
  );
}

export function IconDescarga(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <path d="M12 4v10" />
      <path d="m8 10.5 4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  );
}

export function IconUnidad(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <path d="M3 15.5V9.5A1.5 1.5 0 0 1 4.5 8h8.2l2.6 3H19a2 2 0 0 1 2 2v2.5" />
      <path d="M3 15.5h2M9.5 15.5h5M19 15.5h2" />
      <circle cx="7.2" cy="16.5" r="1.8" />
      <circle cx="16.8" cy="16.5" r="1.8" />
    </svg>
  );
}

export function IconPersonal(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <circle cx="9.5" cy="8.5" r="3" />
      <path d="M3.5 19c0-3 2.7-4.8 6-4.8s6 1.8 6 4.8" />
      <path d="M16 5.6a3 3 0 0 1 0 5.8" />
      <path d="M17.5 14.6c1.9.6 3 1.9 3 3.4" />
    </svg>
  );
}

export function IconCarpeta(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l1.8 2.2H19a1.5 1.5 0 0 1 1.5 1.5v8.8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-11Z" />
      <path d="M3.5 11h17" />
    </svg>
  );
}


export function IconEdificio(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <path d="M4 20V6.5A1.5 1.5 0 0 1 5.5 5h7A1.5 1.5 0 0 1 14 6.5V20" />
      <path d="M14 10h4.5A1.5 1.5 0 0 1 20 11.5V20" />
      <path d="M3 20h18" />
      <path d="M7 8.5h1.5M9.5 8.5H11M7 12h1.5M9.5 12H11M7 15.5h1.5M9.5 15.5H11M16.5 13.5H18M16.5 16.5H18" />
    </svg>
  );
}

export function IconCruz(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6v-6Z" />
    </svg>
  );
}

export function IconLuna(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

export function IconSol(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </svg>
  );
}

export function IconProteccion(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6l-7-2.5Z" />
      <path d="m9.5 12 1.8 1.8 3.4-3.6" />
    </svg>
  );
}

export function IconMaletin(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <rect x="3.5" y="7.5" width="17" height="12" rx="1.5" />
      <path d="M9 7.5V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2" />
      <path d="M3.5 12.5h17" />
    </svg>
  );
}

export function IconMegafono(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <path d="M4 10v4a1 1 0 0 0 1 1h2.5l7 4V5l-7 4H5a1 1 0 0 0-1 1Z" />
      <path d="M17.5 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M7.5 15v4" />
    </svg>
  );
}

export function IconAlerta(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <path d="M12 4 3.5 19h17L12 4Z" />
      <path d="M12 10v4M12 16.5v.5" />
    </svg>
  );
}

export function IconCheck(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function IconCaja(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <path d="m3.5 7.5 8.5-4 8.5 4v9l-8.5 4-8.5-4v-9Z" />
      <path d="m3.5 7.5 8.5 4 8.5-4" />
      <path d="M12 11.5v9" />
    </svg>
  );
}

export function IconMas(p: Props) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}
