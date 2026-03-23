'use client';

import { usePathname } from 'next/navigation';

/**
 * Renders children on every route EXCEPT "/" (the landing page).
 * Used in the root layout to hide the generic nav on the Creator Podium
 * landing page, which has its own full-screen design.
 */
export default function LandingHide({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/') return null;
  return <>{children}</>;
}
