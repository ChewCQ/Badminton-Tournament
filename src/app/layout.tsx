import "./globals.css";

export const metadata = {
  title: "Badminton Tournament Manager",
  description: "Modern badminton tournament management platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
