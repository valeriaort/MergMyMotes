import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'MergMyMotes', description: 'Your notes, with room to learn.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
