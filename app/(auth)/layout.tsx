'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    useEffect(() => {
    }, [pathname]);

    return <>{children}</>;
}