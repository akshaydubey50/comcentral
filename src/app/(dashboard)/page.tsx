import { Suspense } from 'react';

import { LoadingState } from '@/components/feedback';
import { InsightsDashboard } from '@/components/insights/insights-dashboard';

export default function OverviewPage() {
  return <Suspense fallback={<LoadingState label="Loading pay overview" />}><InsightsDashboard /></Suspense>;
}
