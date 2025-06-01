'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navigation = [
    { name: 'Overview', href: '/dashboard' },
    { name: 'Usage', href: '/dashboard/usage' },
    { name: 'API Keys', href: '/dashboard/keys' },
    { name: 'Billing', href: '/dashboard/billing' },
];

export function DashboardNav() {
    const pathname = usePathname();

    return (
        <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center">
                        <Link href="/dashboard" className="text-xl font-bold text-blue-600">
                            UniAI
                        </Link>
                        <div className="ml-10 flex space-x-8">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        'px-3 py-2 text-sm font-medium rounded-md',
                                        pathname === item.href
                                            ? 'text-blue-600 bg-blue-50'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    )}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button className="text-gray-500 hover:text-gray-700">
                            Settings
                        </button>
                        <button className="text-gray-500 hover:text-gray-700">
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}