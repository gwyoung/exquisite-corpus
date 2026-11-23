import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Exquisite Corpus",
  description: "Write poems together, one line at a time.",
};

const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-stone-50 font-sans text-stone-900">
        {/* Narrow, centered column with side margins (mobile-first). */}
        <main className="mx-auto w-full max-w-md px-4 py-12">{children}</main>
      </body>
    </html>
  );
};

export default RootLayout;
