import "./globals.css";

export const metadata = {
  title: "HEXA Badminton Tournament",
  description: "Modern badminton tournament management platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="w-full h-full antialiased">
      <body className="w-full min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        {children}
      </body>
    </html>
  );
}
