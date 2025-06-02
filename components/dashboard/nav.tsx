'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

import {
    User,
    LogOut,
    Menu,
    X,
    LayoutDashboard,
    Activity,
    Layers,
    Key,
    Users,
    Folder,
    Bell,
    CreditCard,
    FileText,
    Settings,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Zap,
    Shield,
    BarChart3,
} from 'lucide-react';

const navigation = [
    {
        name: 'Overview',
        href: '/dashboard',
        icon: LayoutDashboard,
        color: 'from-blue-500 to-cyan-500',
        bgColor: 'bg-blue-500/10',
        description: 'Dashboard overview'
    },
    {
        name: 'Usage',
        href: '/dashboard/usage',
        icon: BarChart3,
        color: 'from-purple-500 to-pink-500',
        bgColor: 'bg-purple-500/10',
        description: 'API usage analytics'
    },
    {
        name: 'Models',
        href: '/dashboard/models',
        icon: Sparkles,
        color: 'from-amber-500 to-orange-500',
        bgColor: 'bg-amber-500/10',
        description: 'AI model management'
    },
    {
        name: 'API Keys',
        href: '/dashboard/keys',
        icon: Key,
        color: 'from-emerald-500 to-teal-500',
        bgColor: 'bg-emerald-500/10',
        description: 'Manage access keys'
    },
    {
        name: 'Projects',
        href: '/dashboard/projects',
        icon: Folder,
        color: 'from-indigo-500 to-purple-500',
        bgColor: 'bg-indigo-500/10',
        description: 'Project organization'
    },
    {
        name: 'Alerts',
        href: '/dashboard/alerts',
        icon: Bell,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        description: 'Cost & usage alerts'
    },
    {
        name: 'Billing',
        href: '/dashboard/billing',
        icon: CreditCard,
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-500/10',
        description: 'Billing & invoices'
    },
    {
        name: 'Audit Logs',
        href: '/dashboard/audit-logs',
        icon: Shield,
        color: 'from-gray-500 to-slate-500',
        bgColor: 'bg-gray-500/10',
        description: 'Security audit trail'
    },
    {
        name: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
        color: 'from-slate-500 to-gray-500',
        bgColor: 'bg-slate-500/10',
        description: 'Account settings'
    },
];

interface User {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
}

interface DashboardNavProps {
    user: User;
}

export function DashboardNav({ user }: DashboardNavProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setCollapsed(true);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut({ redirect: true, callbackUrl: '/' });
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    return (
        <>
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
                <div className="flex items-center justify-between px-4 h-16">
                    <Link href="/dashboard" className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                            UniAI
                        </span>
                    </Link>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            <motion.aside
                initial={false}
                animate={{ width: collapsed ? 80 : 280 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-white/80 backdrop-blur-xl border-r border-gray-200/50"
            >
                <div className="h-20 flex items-center justify-between px-4">
                    <Link href="/dashboard" className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <AnimatePresence>
                            {!collapsed && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                                        UniAI
                                    </h1>
                                    <p className="text-xs text-gray-500">AI Gateway Platform</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Link>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
                    >
                        {collapsed ? (
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                        ) : (
                            <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                        )}
                    </button>
                </div>

                <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        const isHovered = hoveredItem === item.name;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onMouseEnter={() => setHoveredItem(item.name)}
                                onMouseLeave={() => setHoveredItem(null)}
                                className={cn(
                                    'relative flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group',
                                    isActive
                                        ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-lg'
                                        : 'hover:bg-gray-100 text-gray-700'
                                )}
                            >
                                {!isActive && isHovered && (
                                    <motion.div
                                        layoutId="hoverBackground"
                                        className={cn('absolute inset-0 rounded-xl', item.bgColor)}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    />
                                )}

                                <div className={cn(
                                    'relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200',
                                    isActive
                                        ? 'bg-white/20'
                                        : isHovered
                                            ? 'bg-gradient-to-r ' + item.color
                                            : 'bg-gray-100'
                                )}>
                                    <item.icon className={cn(
                                        'w-5 h-5 transition-colors duration-200',
                                        isActive || isHovered ? 'text-white' : 'text-gray-600'
                                    )} />
                                </div>

                                <AnimatePresence>
                                    {!collapsed && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="ml-3 flex-1"
                                        >
                                            <p className={cn(
                                                'font-medium text-sm',
                                                isActive ? 'text-white' : 'text-gray-900'
                                            )}>
                                                {item.name}
                                            </p>
                                            {isHovered && !isActive && (
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {item.description}
                                                </p>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {collapsed && (
                                    <AnimatePresence>
                                        {isHovered && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-50"
                                            >
                                                {item.name}
                                                <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-gray-900 border-b-[6px] border-b-transparent" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-gray-200/50 p-3">
                    <div className={cn(
                        'flex items-center rounded-xl p-3 mb-2 transition-all duration-200',
                        collapsed ? 'justify-center' : 'space-x-3 bg-gray-50'
                    )}>
                        <div className="relative">
                            {user.image ? (
                                <img
                                    src={user.image}
                                    alt={user.name || 'User'}
                                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-white shadow-md"
                                />
                            ) : (                                <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                        </div>

                        <AnimatePresence>
                            {!collapsed && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="flex-1 min-w-0"
                                >
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {user.name || 'User'}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {user.email}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        onClick={handleSignOut}
                        className={cn(
                            'w-full flex items-center rounded-xl p-3 text-sm font-medium transition-all duration-200 group',
                            'hover:bg-red-50 hover:text-red-600',
                            collapsed ? 'justify-center' : 'space-x-3'
                        )}
                    >
                        <LogOut className="w-5 h-5 text-gray-500 group-hover:text-red-600 transition-colors" />
                        <AnimatePresence>
                            {!collapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                >
                                    Sign out
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </div>
            </motion.aside>

            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-80 bg-white/95 backdrop-blur-xl shadow-2xl"
                        >
                            <div className="flex flex-col h-full">
                                <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200/50">
                                    <Link href="/dashboard" className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                                            <Zap className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                                                UniAI
                                            </h1>
                                            <p className="text-xs text-gray-500">AI Gateway Platform</p>
                                        </div>
                                    </Link>
                                    <button
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>

                                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                                    {navigation.map((item, index) => {
                                        const isActive = pathname === item.href;

                                        return (
                                            <motion.div
                                                key={item.name}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                            >
                                                <Link
                                                    href={item.href}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className={cn(
                                                        'flex items-center px-4 py-3 rounded-xl transition-all duration-200',
                                                        isActive
                                                            ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-lg'
                                                            : 'hover:bg-gray-100 text-gray-700'
                                                    )}
                                                >
                                                    <div className={cn(
                                                        'flex items-center justify-center w-10 h-10 rounded-lg',
                                                        isActive
                                                            ? 'bg-white/20'
                                                            : 'bg-gray-100'
                                                    )}>
                                                        <item.icon className={cn(
                                                            'w-5 h-5',
                                                            isActive ? 'text-white' : 'text-gray-600'
                                                        )} />
                                                    </div>
                                                    <div className="ml-3">
                                                        <p className={cn(
                                                            'font-medium',
                                                            isActive ? 'text-white' : 'text-gray-900'
                                                        )}>
                                                            {item.name}
                                                        </p>
                                                        <p className={cn(
                                                            'text-xs',
                                                            isActive ? 'text-white/80' : 'text-gray-500'
                                                        )}>
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                </Link>
                                            </motion.div>
                                        );
                                    })}
                                </nav>

                                <div className="border-t border-gray-200/50 p-4">
                                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl mb-3">
                                        {user.image ? (
                                            <img
                                                src={user.image}
                                                alt={user.name || 'User'}
                                                className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-md"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                                                <User className="w-7 h-7 text-white" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {user.name || 'User'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center justify-center space-x-2 p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                                    >
                                        <LogOut className="w-5 h-5" />
                                        <span className="font-medium">Sign out</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className={cn(
                'hidden lg:block transition-all duration-300',
                collapsed ? 'w-20' : 'w-[280px]'
            )} />
        </>
    );
}