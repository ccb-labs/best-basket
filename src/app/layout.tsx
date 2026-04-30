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
  title: {
    default: "Best Basket",
    template: "%s | Best Basket",
  },
  description:
    "Create shopping lists, compare prices across stores, and find the cheapest way to shop.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // suppressHydrationWarning silences false-positive hydration warnings
  // caused by browser extensions (e.g. LanguageTool, Grammarly) that
  // inject attributes like data-lt-installed onto <html> after the page
  // loads. It only suppresses warnings on this element, not its children.
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
