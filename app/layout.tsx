import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NCTT — Next Chapter Transition Tracker",
  description: "Personal transition planning, finances, housing and college tools.",
  icons: {
    icon: [{url: "/favicon.png?v=2", type: "image/png"}],
    shortcut: "/favicon.png?v=2",
    apple: "/apple-touch-icon.png?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
