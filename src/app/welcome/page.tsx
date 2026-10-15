import type { Metadata } from 'next';

import { WelcomeContent } from '@/components/welcome-content';

export const metadata: Metadata = {
  title: 'Welcome to ComCentral',
  description: 'Learn how ComCentral supports employee records, salary history, CSV migration, and pay reporting.',
};

export default function WelcomePage() {
  return <WelcomeContent />;
}
