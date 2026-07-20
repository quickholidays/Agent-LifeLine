import { Outfit, Bevan } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

const bevan = Bevan({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-luxury",
});

export const metadata = {
  title: "LifeLine - Agent Performance & Activity Hub",
  description: "The premium GoHighLevel agent performance, activity tracking, and call analytics hub.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable} ${bevan.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
