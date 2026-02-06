/** @type {import('next').Metadata} */
export const metadata = {
  title: "CineList",
  description: "Track movies by country with reviews and posters.",
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
