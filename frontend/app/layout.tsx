import type { Metadata } from "next";
import { Besley, Instrument_Sans, Spline_Sans_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const besley = Besley({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

const splineSansMono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Terminal — Boi gordo",
  description: "Clareza econômica da operação antes de qualquer decisão financeira",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body
        className={`${besley.variable} ${instrumentSans.variable} ${splineSansMono.variable} font-sans antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
