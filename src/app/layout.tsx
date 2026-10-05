import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creative Studio",
  description: "AI creative workspace for brands, social media, carousels and branding."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
