import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KJ Eruv Map",
  description: "Eruv boundaries and information for Kiryas Joel and surrounding areas.",
  icons: [
    // Icon for Light Mode
    {
      rel: 'icon',
      url: '/fence-light.svg',
      media: '(prefers-color-scheme: light)'
    },
    // Icon for Dark Mode
    {
      rel: 'icon',
      url: '/fence.svg',
      media: '(prefers-color-scheme: dark)'
    }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="h-screen w-screen">{children}</div>
      </body>
    </html>
  );
}

