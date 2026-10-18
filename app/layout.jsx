import "./globals.css";

export const metadata = {
  title: "Trip Bareng",
  description: "Tabungan, itinerary, pengeluaran, dan bawaan buat trip bareng.",
};

// viewportFit "cover" biar bar bawah nggak ketutup garis home di iPhone
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
