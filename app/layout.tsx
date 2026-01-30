import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sneak's FDF Analytics",
  description: "Real-time price and performance analytics for Sports.fun player tokens",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <a href="/" className="text-xl font-bold text-white">
                Sneak's FDF Analytics
              </a>
              <div className="flex gap-6">
                <a href="/players" className="text-gray-300 hover:text-white transition-colors">
                  Players
                </a>
                <a href="/analytics" className="text-gray-300 hover:text-white transition-colors">
                  Analytics
                </a>
                <a href="/leaderboards" className="text-gray-300 hover:text-white transition-colors">
                  Leaderboards
                </a>
                <a href="/teams" className="text-gray-300 hover:text-white transition-colors">
                  Teams
                </a>
                <a href="/compare" className="text-gray-300 hover:text-white transition-colors">
                  Compare
                </a>
                <a href="/historical" className="text-gray-300 hover:text-white transition-colors">
                  Historical
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
