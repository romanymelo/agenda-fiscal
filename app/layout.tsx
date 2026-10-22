import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans, Montserrat } from "next/font/google";
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

// Só para o nome do produto (logotipo e slogan), num estilo geométrico.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Agenda Fiscal",
  description: "Painel interno de vencimentos e processos do escritório",
};

// Roda antes da primeira pintura, para a página já nascer no tema certo (sem piscar): usa a escolha
// salva ou, na falta dela, o tema do sistema. O botão de components/tema.tsx troca e grava.
const ESCOLHER_TEMA = `try{var t=localStorage.getItem('tema');if(t!=='claro'&&t!=='escuro')t=matchMedia('(prefers-color-scheme: dark)').matches?'escuro':'claro';document.documentElement.dataset.theme=t==='escuro'?'dark':'light'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${plexSans.variable} ${bricolage.variable} ${montserrat.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ESCOLHER_TEMA }} />
      </head>
      <body className="min-h-full flex flex-col bg-espuma text-tinta">
        {children}
      </body>
    </html>
  );
}
