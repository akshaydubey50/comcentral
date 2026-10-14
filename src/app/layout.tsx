import type { Metadata } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { Providers } from '@/components/providers';
import './globals.css';
export const metadata: Metadata = { title: 'ACME Salary | HR Workspace', description: 'Manage employee salaries and understand organizational pay.', robots: { index: false, follow: false } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppRouterCacheProvider><Providers>{children}</Providers></AppRouterCacheProvider></body></html>;
}
