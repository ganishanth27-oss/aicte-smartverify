import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AICTE SmartVerify',
  description: 'Transparent institutional application validation and compliance assistance demo.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
