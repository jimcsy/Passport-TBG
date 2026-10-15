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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(event) {
                var msg = event && event.message ? String(event.message) : '';
                if (msg.indexOf('Loading chunk') !== -1 || msg.indexOf('ChunkLoadError') !== -1) {
                  if (!window.sessionStorage.getItem('chunk_reload_retried')) {
                    window.sessionStorage.setItem('chunk_reload_retried', '1');
                    window.location.reload();
                  }
                }
              });
              window.addEventListener('load', function() {
                window.sessionStorage.removeItem('chunk_reload_retried');
              });
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-beat-canvas text-beat-maroon antialiased selection:bg-beat-gold selection:text-white">
        {children}
      </body>
    </html>
  );
}
