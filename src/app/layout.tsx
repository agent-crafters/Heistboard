import type { Metadata } from "next";

import "./tailwind.css";

export const metadata: Metadata = {
  title: "Heistboard — Mission Plan proof",
  description:
    "Mark a fictional route on an original neighborhood map, then preview and download the exact saved image.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
