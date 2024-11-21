import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aidbox Forms Smart Launch",
  description:
    "Use this template to get started with Aidbox Forms Smart Launch",
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
