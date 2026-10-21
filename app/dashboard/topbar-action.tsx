'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export default function TopbarAction({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById('dashboard-topbar-actions'));
  }, []);

  return target ? createPortal(children, target) : null;
}
