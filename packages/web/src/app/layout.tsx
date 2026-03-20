import type { Metadata } from 'next';
import { SWRConfig } from 'swr';
import { MainLayout } from '@/components/layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'DouyinClaw - 抖音社交助手',
  description: '自动续火花 + AI智能回复',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-douyin-dark text-white min-h-screen">
        <SWRConfig
          value={{
            revalidateOnFocus: false,
            shouldRetryOnError: false,
          }}
        >
          <MainLayout>{children}</MainLayout>
        </SWRConfig>
      </body>
    </html>
  );
}
