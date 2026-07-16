import type { Metadata } from "next";
import "@fontsource-variable/fraunces/wght.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  title: "Jizuo · Turn AI traces into stories",
  description: "把一次 AI 实操轨迹，变成有证据、可发布的自媒体作品。",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Jizuo · Turn AI traces into stories",
    description: "导入 Agent 会话，生成可追溯的决策图与 8 页故事板。",
    type: "website",
    images: [{ url: "/jizuo-cover.svg", width: 1200, height: 630, alt: "Jizuo — Turn AI traces into stories" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
