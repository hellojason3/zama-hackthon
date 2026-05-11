import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://privyields.xyz"),
  title: "Privyields",
  description: "Confidential Qualified Yield Market built with Zama",
  icons: {
    icon: "/priv.png",
    shortcut: "/priv.png",
    apple: "/priv.png"
  },
  openGraph: {
    title: "Privyields",
    description: "Confidential Qualified Yield Market built with Zama",
    images: [{url: "/priv.png", alt: "Privyields logo"}]
  },
  twitter: {
    card: "summary",
    title: "Privyields",
    description: "Confidential Qualified Yield Market built with Zama",
    images: ["/priv.png"]
  }
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
