import "./globals.css";

export const metadata = {
  title: "Group Trip Planner",
  description: "Plan our trip together: savings, itinerary, budget split and packing.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
