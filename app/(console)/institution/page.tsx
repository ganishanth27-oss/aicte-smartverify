import { redirect } from 'next/navigation';
import { getSession } from '@/src/lib/auth';
import DashboardPage from '@/components/dashboard-views';

export const dynamic = 'force-dynamic';

export default async function InstitutionDashboardRoute() {
  const user = await getSession();
  if (user.role !== 'Institution Applicant') redirect('/government');
  return <DashboardPage />;
}
