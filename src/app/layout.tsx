import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource-variable/inter";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal Akademik Program Studi",
  description: "Pantau absensi, tugas, jadwal kuliah, dan kalender akademik dalam satu portal.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <div className="wrap">
          <Header />
          <main className="min-w-0 flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
