import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const metadataBase = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : undefined;

export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
  title: {
    default: "Optimal Content — The Optimizer Platform",
    template: "%s · Optimal Content",
  },
  description:
    "Hire expert video optimizers on a funded marketplace: post jobs, collaborate on briefs, and release payouts when work is approved.",
  applicationName: "Optimal Content",
  openGraph: {
    title: "Optimal Content — The Optimizer Platform",
    description:
      "Funded marketplace connecting creators and optimizers for YouTube and short-form content strategy.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Optimal Content — The Optimizer Platform",
    description:
      "Funded marketplace connecting creators and optimizers for YouTube and short-form content strategy.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="relative min-h-full bg-[#020617] font-sans text-slate-200 antialiased">
        <div
          className="pointer-events-none fixed inset-0 z-[1] opacity-[0.03] mix-blend-overlay"
          aria-hidden
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
        <Providers>
          <div className="relative z-[2]">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
