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
  metadataBase: new URL("https://shillguardapp.com"),
  title: "Shadowban Risk Rater - ShillGuard",
  description: "Free tool to check your Reddit, Facebook, or email content for spam triggers and shadowban risk. Powered by ShillGuard.",
  alternates: {
    canonical: "https://shillguardapp.com/spam-risk-detector",
  },
  openGraph: {
    title: "Shadowban Risk Rater - ShillGuard",
    description: "Free tool to check your Reddit, Facebook, or email content for spam triggers and shadowban risk. Powered by ShillGuard.",
    url: "https://shillguardapp.com/spam-risk-detector",
    siteName: "ShillGuard",
    images: [
      {
        url: "/spam-risk-detector/logo.png",
        width: 800,
        height: 600,
        alt: "ShillGuard Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shadowban Risk Rater - ShillGuard",
    description: "Free tool to check your Reddit, Facebook, or email content for spam triggers and shadowban risk. Powered by ShillGuard.",
    images: ["/spam-risk-detector/logo.png"],
  },
};

import { Analytics } from "@vercel/analytics/react"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
