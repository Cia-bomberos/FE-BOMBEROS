import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders, Instrument_Serif } from "next/font/google";
import "./globals.css";

const body = Archivo({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const display = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "France N°3 · Acceso institucional",
    template: "%s · France N°3",
  },
  description:
    "Plataforma de gestión institucional de la Compañía de Bomberos Voluntarios France N°3 — Bandeja Documental y Dashboard Ejecutivo.",
};

export const viewport: Viewport = {
  themeColor: "#07060a",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-PE"
      className={`${body.variable} ${display.variable} ${serif.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
