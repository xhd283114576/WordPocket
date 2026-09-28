import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WordPocket · 随手记单词",
  description: "随时随地记录、整理和复习英文单词，用 AI 生成自然的学习例句。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
