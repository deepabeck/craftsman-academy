import type { Metadata, Viewport } from "next";
import { Cinzel, Space_Grotesk } from "next/font/google";
import { ClientLayout } from "./client-layout";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel-var",
  weight: ["400", "600", "700", "900"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body-var",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "Craftsman Academy";

export const metadata: Metadata = {
  title: schoolName,
  description: "Homeschool Management Portal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: schoolName,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/assets/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/assets/app-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/assets/app-icon-180.png",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#08111E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${spaceGrotesk.variable}`}>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
