import { Suspense } from 'react';

import { EmployeeDirectory } from '@/components/employees/employee-directory';
import { LoadingState } from '@/components/feedback';

export default function EmployeesPage() {
  return <Suspense fallback={<LoadingState label="Loading employee directory" />}><EmployeeDirectory /></Suspense>;
}
