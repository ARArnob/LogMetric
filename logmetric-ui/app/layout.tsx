import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./lib/auth";
import { ThemeProvider, themeInitScript } from "./lib/theme";
import { ToastProvider } from "./lib/toast";
import SessionExpiryHandler from "./components/SessionExpiryHandler";
import BackendDownBanner from "./components/BackendDownBanner";

export const metadata: Metadata = {
  title: "LogMetric — Intelligent Log Telemetry",
  description:
    "Advanced log ingestion with real-time pattern recognition, clustering, and anomaly detection. Built for scale.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Stamps data-theme before first paint so the stored theme never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <BackendDownBanner />
              <SessionExpiryHandler />
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
