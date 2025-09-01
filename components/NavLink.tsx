'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
};

export default function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  const classes = `px-3 py-2 rounded-md text-sm font-medium ${
    isActive
      ? 'bg-gray-900 text-white'
      : 'text-gray-700 hover:bg-gray-700 hover:text-white'
  }`;

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
