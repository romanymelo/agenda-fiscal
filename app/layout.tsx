import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Só para títulos e números grandes (classe `font-display`).
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agenda Fiscal",
  description: "Painel interno de vencimentos e processos do escritório",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${plexSans.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-espuma text-tinta">
        {children}
      </body>
    </html>
  );
}
