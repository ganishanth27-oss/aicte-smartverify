import { redirect } from 'next/navigation';
import { getSession } from '@/src/lib/auth';
import DashboardPage from '@/components/dashboard-views';

export const dynamic = 'force-dynamic';

export default async function GovernmentDashboardRoute() {
  const user = await getSession();
  if (user.role === 'Institution Applicant') redirect('/institution');
  return <DashboardPage />;
}
