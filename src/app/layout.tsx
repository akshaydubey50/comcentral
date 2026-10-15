import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { Providers } from '@/components/providers';
import './globals.css';
export const metadata: Metadata = { title: 'ComCentral | HR Workspace', description: 'Manage employee salaries and understand organizational pay.', robots: { index: false, follow: false } };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Reading request headers keeps documents dynamic so their CSP nonce is never cached.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <html lang="en"><body><AppRouterCacheProvider options={{ nonce }}><Providers>{children}</Providers></AppRouterCacheProvider></body></html>;
}
