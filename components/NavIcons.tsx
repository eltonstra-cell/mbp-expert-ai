import type { ReactNode } from "react";

export type NavIconName =
  | "registrar"
  | "inicio"
  | "visitas"
  | "central"
  | "ambientes"
  | "checklist"
  | "evidencias"
  | "ncs"
  | "plano"
  | "acompanhamento"
  | "relatorio"
  | "empresas"
  | "pops"
  | "acessos"
  | "ajuda"
  | "mais"
  | "texto"
  | "sincronizar"
  | "sobre"
  | "sair";

const TRACADOS: Record<NavIconName, ReactNode> = {
  inicio: (
    <>
      <path d="m3 11 9-7 9 7" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-6h5v6" />
    </>
  ),
  visitas: (
    <>
      <path d="M9 4h6v3H9z" />
      <path d="M7 5.5H6A1.5 1.5 0 0 0 4.5 7v12A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5V7A1.5 1.5 0 0 0 18 5.5h-1" />
      <path d="M8.5 12h7M8.5 16h5" />
    </>
  ),
  empresas: (
    <>
      <path d="M4 21h16" />
      <path d="M6 21V5h8v16" />
      <path d="M14 10h4v11" />
      <path d="M9 9h2M9 13h2M9 17h2" />
    </>
  ),
  central: (
    <>
      <path d="M4 4h7v7H4z" />
      <path d="M13 4h7v4h-7z" />
      <path d="M13 11h7v9h-7z" />
      <path d="M4 14h7v6H4z" />
    </>
  ),
  ambientes: (
    <>
      <path d="m12 3-9 5 9 5 9-5-9-5z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
  checklist: (
    <>
      <path d="M9.5 6H20M9.5 12H20M9.5 18H20" />
      <path d="m3.5 6 1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17" />
    </>
  ),
  evidencias: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  registrar: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
      <path d="M12 11.6v2.8M10.6 13h2.8" />
    </>
  ),
  ncs: (
    <>
      <path d="M12 3.5 2.8 19.5h18.4L12 3.5z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  plano: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h12l-2 4 2 4H5" />
    </>
  ),
  acompanhamento: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  relatorio: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h6M9 17h6" />
    </>
  ),
  pops: (
    <>
      <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
      <path d="M5 17a3 3 0 0 1 3-3h10" />
    </>
  ),
  acessos: (
    <>
      <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M5 21a7 7 0 0 1 14 0" />
      <path d="M18 4.5h3M19.5 3v3" />
    </>
  ),
  ajuda: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7" />
      <path d="M12 17h.01" />
    </>
  ),
  mais: <path d="M5 5h4v4H5zM15 5h4v4h-4zM5 15h4v4H5zM15 15h4v4h-4z" />,
  texto: (
    <>
      <path d="m4 19 5-13 5 13M5.8 15h6.4" />
      <path d="m16 19 2.5-6 2.5 6M16.8 17h3.4" />
    </>
  ),
  sincronizar: (
    <>
      <path d="M20 11a8 8 0 0 0-14.5-4M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4" />
    </>
  ),
  sobre: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  sair: (
    <>
      <path d="m10 17 5-5-5-5M15 12H3" />
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    </>
  ),
};

// Traço branco de 2.2, desenhado sobre o tile colorido.
export function NavIcon({ name, size = 24 }: { name: NavIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {TRACADOS[name]}
    </svg>
  );
}
