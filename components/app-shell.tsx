'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Activity, Archive, BarChart3, BookOpenCheck, Building2, ClipboardCheck, FileCheck2, FileClock, FileSearch, Fingerprint, Gauge, GitBranch, LayoutDashboard, ListChecks, LogOut, Settings, ShieldCheck, UploadCloud, UserCog, Users, X } from 'lucide-react';
import { DEMO_BANNER, type SessionUser } from '@/src/lib/types';

const primary = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/applications', label: 'Applications', icon: FileCheck2 },
  { href: '/documents', label: 'Document workspace', icon: UploadCloud },
  { href: '/findings', label: 'Findings & review', icon: ListChecks },
  { href: '/verification', label: 'Issuer verification', icon: Fingerprint },
  { href: '/infrastructure', label: 'Infrastructure', icon: Building2 }
];
const governance = [
  { href: '/government/complaints', label: 'Complaint monitoring', icon: ClipboardCheck },
  { href: '/rules', label: 'Regulatory rules', icon: GitBranch },
  { href: '/review', label: 'Officer review', icon: ShieldCheck },
  { href: '/audit', label: 'Audit trail', icon: FileClock },
  { href: '/reports', label: 'Reports & exports', icon: BarChart3 }
];
const admin = [
  { href: '/users', label: 'Users & roles', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => { fetch('/api/session').then((r) => r.json()).then((data) => setUser(data.user)).catch(() => null); }, []);
  const applicant = user?.role === 'Institution Applicant';
  const homeHref = applicant ? '/institution' : '/government';
  useEffect(() => {
    if (!user) return;
    const governmentOnly = ['/government', '/verification', '/infrastructure', '/rules', '/review', '/audit', '/reports', '/users', '/settings'];
    if (applicant && (pathname === '/dashboard' || governmentOnly.some((route) => pathname === route || pathname.startsWith(`${route}/`)))) router.replace('/institution');
    if (!applicant && (pathname === '/dashboard' || pathname === '/institution' || pathname.startsWith('/institution/'))) router.replace('/government');
  }, [applicant, pathname, router, user]);
  const visiblePrimary = applicant ? primary.filter((item) => ['/dashboard', '/applications', '/documents', '/findings'].includes(item.href)) : primary;
  const visibleGovernance = applicant ? [] : governance;
  const visibleAdmin = applicant ? [] : admin;
  const current = [...visiblePrimary, ...visibleGovernance, ...visibleAdmin].find((item) => item.href === '/dashboard' ? pathname === homeHref : pathname === item.href || pathname.startsWith(`${item.href}/`));
  const initials = user?.name.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'SV';
  async function logout() { await fetch('/api/session', { method: 'DELETE' }); router.push('/login'); }
  return <div className={`page-grid ${applicant ? 'shell-institution' : 'shell-government'}`}>
    <aside className="sidebar">
      <Link href={homeHref} className="brand"><span className="brand-mark"/><span><h1>SmartVerify</h1><p>Institutional review cockpit</p></span></Link>
      <nav className="nav">
        <div className="nav-label">Workspace</div>
        {visiblePrimary.map((item) => <NavItem key={item.href} {...item} href={item.href === '/dashboard' ? homeHref : item.href} label={applicant && item.href === '/dashboard' ? 'My dashboard' : applicant && item.href === '/applications' ? 'My applications' : applicant && item.href === '/findings' ? 'My findings' : item.label} active={current?.href === item.href} />)}
        {visibleGovernance.length > 0 && <><div className="nav-label">Governance</div>{visibleGovernance.map((item) => <NavItem key={item.href} {...item} active={current?.href === item.href} />)}</>}
        {visibleAdmin.length > 0 && <><div className="nav-label">Administration</div>{visibleAdmin.map((item) => <NavItem key={item.href} {...item} active={current?.href === item.href} />)}</>}
      </nav>
      <div className="sidebar-bottom"><div className="small" style={{ color: '#7fa0c4', lineHeight: 1.5 }}><Activity size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Demo services online<br /><span className="mono" style={{ fontSize: 9 }}>SIMULATION MODE / v1.0.0</span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="topbar-left"><span className="eyebrow">{applicant ? 'Institution submission portal' : current?.label || 'Government command center'}</span><h1 className="topbar-title">{applicant ? 'Institution workspace' : 'AICTE SmartVerify · Government review'}</h1></div><div className="topbar-right"><div className="session-pill"><span>{user?.role || 'Loading session'}</span><span className="avatar">{initials}</span><button className="btn btn-ghost" onClick={logout} title="Sign out"><LogOut size={14}/></button></div></div></header>
      <div className="content"><div className="demo-banner"><span />{DEMO_BANNER}</div>{children}</div>
    </main>
  </div>;
}
function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Gauge; active?: boolean }) { return <Link href={href} className={`nav-item ${active ? 'active' : ''}`}><Icon />{label}</Link>; }
