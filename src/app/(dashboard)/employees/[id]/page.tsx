import { EmployeeDetails } from '@/components/employees/employee-details';

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmployeeDetails id={id} />;
}
