import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Bistro Group | Growth Passport (BEAT)",
  description: "Digital Growth Passport portal for The Bistro Group BEAT Program",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-beat-canvas text-[#2B1810] antialiased selection:bg-beat-gold selection:text-white">
        {children}
      </body>
    </html>
  );
}
