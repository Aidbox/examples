import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/toaster";

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
      <head>
        <script
          src={`${process.env.NEXT_PUBLIC_FORMS_WEBCOMPONENT_BASE_URL || "https://form-builder.aidbox.app"}/static/aidbox-forms-renderer-webcomponent.js`}
          async
        ></script>
        <script
          src={`${process.env.NEXT_PUBLIC_FORMS_WEBCOMPONENT_BASE_URL || "https://form-builder.aidbox.app"}/static/aidbox-forms-builder-webcomponent.js`}
          async
        ></script>
      </head>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
