import Providers from "@/components/providers";
import type { Metadata } from "next";
import { Inter, Press_Start_2P } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const pressStart2P = Press_Start_2P({
  subsets: ["latin"],
  weight: "400", // Press Start 2P only has one weight
  variable: '--font-press-start-2p',
});

// Configure viewport for better mobile experience
const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  height: 'device-height'
};

export const metadata: Metadata = {
  title: "RugQuest - Token Launch Simulator",
  description: "Be the shadowy founder of your own memecoin. Rug or moon, fame or prison - it's your choice, ser. 🚀💸",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  // Favicon
  icons: {
    icon: '/images/icon.png',
    apple: '/images/icon.png',
  },
  // Open Graph
  openGraph: {
    type: "website",
    url: "https://rugquest.xyz",
    title: "RugQuest - Token Launch Simulator",
    description: "Be the shadowy founder of your own memecoin. Rug or moon, fame or prison - it's your choice, ser.",
    siteName: "RugQuest",
    images: [{
      url: "/images/reply-guy.png",
      width: 800,
      height: 600,
      alt: "RugQuest Reply Guy",
    }],
  },
  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "RugQuest - Token Launch Simulator",
    description: "Be the shadowy founder of your own memecoin. Rug or moon, fame or prison - it's your choice, ser.",
    images: ["/images/reply-guy.png"],
    creator: "@ardaddy",
  },
  // Manifest
  manifest: "/manifest.json",
  applicationName: "RugQuest",
  keywords: ["crypto", "memecoin", "token", "simulation", "game", "farcaster", "web3"],
  creator: "@ardaddy",
  authors: [{ name: "ardaddy", url: "https://twitter.com/ardaerturk" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
      </head>
      <body className={`${inter.variable} ${pressStart2P.variable} font-sans overflow-hidden touch-manipulation`}> {/* Prevent scrolling and improve touch */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
