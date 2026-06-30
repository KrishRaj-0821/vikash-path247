import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Vikash Path — AI-Powered Hyperlocal Progress Tracker",
  description:
    "Janta ki pukaar, AI ka vishleshan, aur verified prashasan. Report civic issues, vote for priorities, and track Swachh Bharat progress with AI-powered transparency.",
  keywords: [
    "Vikash Path",
    "Swachh Bharat",
    "civic reporting",
    "municipal corporation",
    "AI governance",
    "India",
    "hyperlocal",
  ],
  authors: [{ name: "Vikash Path Initiative" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Vikash Path — AI-Powered Hyperlocal Progress Tracker",
    description:
      "Janta ki pukaar, AI ka vishleshan, aur verified prashasan.",
    siteName: "Vikash Path",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground"
      >
        <Providers>
          {children}
        </Providers>
        <Toaster />
        <SonnerToaster position="top-center" richColors />
      </body>
    </html>
  );
}
