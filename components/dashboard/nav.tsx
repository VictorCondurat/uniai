'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';

import {
    User,
    LogOut,
    Menu,
    X,
    LayoutDashboard,
    Key,
    Folder,
    Bell,
    CreditCard,
    Settings,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Zap,
    Shield,
    BarChart3,
    Terminal
} from 'lucide-react';

const PREMIUM_EASE = [0.32, 0.72, 0, 1];
const SPRING_CONFIG = { stiffness: 400, damping: 30, mass: 1 };

const navigation = [
    {
        name: 'Overview',
        href: '/dashboard',
        icon: LayoutDashboard,
        color: 'from-blue-500 to-cyan-500',
        glowColor: 'rgba(59, 130, 246, 0.5)',
        bgColor: 'bg-blue-500/10',
        description: 'Dashboard overview',
        shortcut: '⌘D'
    },
    {
        name: 'Usage',
        href: '/dashboard/usage',
        icon: BarChart3,
        color: 'from-purple-500 to-pink-500',
        glowColor: 'rgba(168, 85, 247, 0.5)',
        bgColor: 'bg-purple-500/10',
        description: 'API usage analytics',
        shortcut: '⌘U'
    },
    {
        name: 'Models',
        href: '/dashboard/models',
        icon: Sparkles,
        color: 'from-amber-500 to-orange-500',
        glowColor: 'rgba(245, 158, 11, 0.5)',
        bgColor: 'bg-amber-500/10',
        description: 'AI model management',
        shortcut: '⌘M'
    },
    {
        name: 'API Keys',
        href: '/dashboard/keys',
        icon: Key,
        color: 'from-emerald-500 to-teal-500',
        glowColor: 'rgba(16, 185, 129, 0.5)',
        bgColor: 'bg-emerald-500/10',
        description: 'Manage access keys',
        shortcut: '⌘K'
    },
    {
        name: 'Fallback Chains',
        href: '/dashboard/fallback-chains',
        icon: Shield,
        color: 'from-rose-500 to-pink-500',
        glowColor: 'rgba(244, 63, 94, 0.5)',
        bgColor: 'bg-rose-500/10',
        description: 'Configure intelligent fallback strategies',
        shortcut: '⌘F'
    },
    {
        name: 'Projects',
        href: '/dashboard/projects',
        icon: Folder,
        color: 'from-indigo-500 to-purple-500',
        glowColor: 'rgba(99, 102, 241, 0.5)',
        bgColor: 'bg-indigo-500/10',
        description: 'Project organization',
        shortcut: '⌘P'
    },
    {
        name: 'Alerts',
        href: '/dashboard/alerts',
        icon: Bell,
        color: 'from-red-500 to-rose-500',
        glowColor: 'rgba(239, 68, 68, 0.5)',
        bgColor: 'bg-red-500/10',
        description: 'Cost & usage alerts',
        shortcut: '⌘A'
    },
    {
        name: 'Billing',
        href: '/dashboard/billing',
        icon: CreditCard,
        color: 'from-green-500 to-emerald-500',
        glowColor: 'rgba(34, 197, 94, 0.5)',
        bgColor: 'bg-green-500/10',
        description: 'Billing & invoices',
        shortcut: '⌘B'
    },
    {
        name: 'Audit Logs',
        href: '/dashboard/audit-logs',
        icon: Shield,
        color: 'from-gray-500 to-slate-500',
        glowColor: 'rgba(107, 114, 128, 0.5)',
        bgColor: 'bg-gray-500/10',
        description: 'Security audit trail',
        shortcut: '⌘L'
    },
    {
        name: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
        color: 'from-slate-500 to-gray-500',
        glowColor: 'rgba(100, 116, 139, 0.5)',
        bgColor: 'bg-slate-500/10',
        description: 'Account settings',
        shortcut: '⌘,'
    },
    {
        name: 'Dev Console',
        href: '/dashboard/dev-console',
        icon: Terminal,
        color: 'from-gray-600 to-slate-800',
        glowColor: 'rgba(71, 85, 105, 0.5)',
        bgColor: 'bg-gray-600/10',
        description: 'Simulate API calls',
        shortcut: '⌘T'
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

const GlowEffect = ({ color, isActive }: { color: string; isActive: boolean }) => {
    if (!isActive) return null;

    return (
        <motion.div
            className="absolute inset-0 -z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <div
                className="absolute inset-0 blur-2xl"
                style={{
                    background: `radial-gradient(circle at center, ${color}, transparent 70%)`,
                    transform: 'scale(1.5)',
                }}
            />
            <div
                className="absolute inset-0 blur-md"
                style={{
                    background: `radial-gradient(circle at center, ${color}, transparent 50%)`,
                }}
            />
        </motion.div>
    );
};

const useMagneticHover = (strength = 0.3) => {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springX = useSpring(x, SPRING_CONFIG);
    const springY = useSpring(y, SPRING_CONFIG);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distanceX = (e.clientX - centerX) * strength;
        const distanceY = (e.clientY - centerY) * strength;
        x.set(distanceX);
        y.set(distanceY);
    }, [x, y, strength]);

    const handleMouseLeave = useCallback(() => {
        x.set(0);
        y.set(0);
    }, [x, y]);

    return { ref, springX, springY, handleMouseMove, handleMouseLeave };
};

const PremiumTooltip = ({ children, content, shortcut }: { children: React.ReactNode; content: string; shortcut?: string }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="relative" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: PREMIUM_EASE }}
                        className="absolute left-full ml-3 px-3 py-2 bg-gray-900/95 backdrop-blur-xl text-white text-sm rounded-xl whitespace-nowrap z-50 pointer-events-none"
                        style={{
                            top: '50%',
                            transform: 'translateY(-50%)',
                            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <span>{content}</span>
                            {shortcut && (
                                <span className="text-xs opacity-60 bg-white/10 px-1.5 py-0.5 rounded">
                                    {shortcut}
                                </span>
                            )}
                        </div>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-gray-900/95 border-b-[6px] border-b-transparent" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export function DashboardNav({ user }: DashboardNavProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeShortcut, setActiveShortcut] = useState<string | null>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const logo = useMagneticHover(0.2);

    const scrollY = useMotionValue(0);
    const scrollProgress = useTransform(scrollY, [0, 100], [0, 1]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {

            if (e.metaKey || e.ctrlKey) {
                const item = navigation.find(nav =>
                    nav.shortcut?.toLowerCase().includes(e.key.toLowerCase())
                );
                if (item) {
                    e.preventDefault();
                    setActiveShortcut(item.name);
                    setTimeout(() => setActiveShortcut(null), 200);
                    window.location.href = item.href;
                }
            }
            if (e.key === 'Escape') {
                setMobileMenuOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

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
            <motion.div
                className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/60 backdrop-blur-2xl border-b border-gray-200/20"
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", ...SPRING_CONFIG }}
                style={{
                    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.05)',
                }}
            >
                <div className="flex items-center justify-between px-4 h-16">
                    <Link href="/dashboard" className="flex items-center space-x-2">
                        <motion.div
                            className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center relative overflow-hidden"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
                            }}
                        >
                            <motion.div
                                className="absolute inset-0 bg-white/30"
                                animate={{
                                    y: ['-100%', '100%'],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "linear",
                                }}
                            />
                            <Zap className="w-6 h-6 text-white relative z-10" />
                        </motion.div>
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                            UniAI
                        </span>
                    </Link>
                    <motion.button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 rounded-xl hover:bg-gray-100/50 transition-all duration-200"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <motion.div
                            animate={{ rotate: mobileMenuOpen ? 180 : 0 }}
                            transition={{ duration: 0.3, ease: PREMIUM_EASE }}
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </motion.div>
                    </motion.button>
                </div>
            </motion.div>

            <motion.aside
                ref={sidebarRef}
                initial={false}
                animate={{ width: collapsed ? 80 : 280 }}
                transition={{ duration: 0.4, ease: PREMIUM_EASE }}
                className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-white/70 backdrop-blur-2xl border-r border-gray-200/20"
                style={{
                    boxShadow: '4px 0 30px rgba(0, 0, 0, 0.05)',
                }}
            >
                <div className="h-20 flex items-center justify-between px-4">
                    <Link href="/dashboard" className="flex items-center space-x-3">
                        <motion.div
                            ref={logo.ref}
                            className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center relative overflow-hidden"
                            style={{
                                x: logo.springX,
                                y: logo.springY,
                                boxShadow: '0 8px 30px rgba(59, 130, 246, 0.35)',
                            }}
                            onMouseMove={logo.handleMouseMove}
                            onMouseLeave={logo.handleMouseLeave}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/30"
                                animate={{
                                    rotate: [0, 360],
                                }}
                                transition={{
                                    duration: 20,
                                    repeat: Infinity,
                                    ease: "linear",
                                }}
                            />
                            <Zap className="w-7 h-7 text-white relative z-10" />
                        </motion.div>
                        <AnimatePresence mode="wait">
                            {!collapsed && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.3, ease: PREMIUM_EASE }}
                                >
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                                        UniAI
                                    </h1>
                                    <p className="text-xs text-gray-500 font-medium">AI Gateway Platform</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Link>
                    <motion.button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2.5 rounded-xl hover:bg-gray-100/50 transition-all duration-200 group relative"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <motion.div
                            animate={{ rotate: collapsed ? 0 : 180 }}
                            transition={{ duration: 0.3, ease: PREMIUM_EASE }}
                        >
                            {collapsed ? (
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                            ) : (
                                <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                            )}
                        </motion.div>
                    </motion.button>
                </div>

                <nav className="flex-1 px-3 pb-4 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    {navigation.map((item, index) => {
                        const isActive = pathname === item.href;
                        const isHovered = hoveredItem === item.name;
                        const isShortcutActive = activeShortcut === item.name;

                        return (
                            <motion.div
                                key={item.name}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                    delay: index * 0.03,
                                    duration: 0.3,
                                    ease: PREMIUM_EASE
                                }}
                            >
                                {collapsed ? (
                                    <PremiumTooltip content={item.name} shortcut={item.shortcut}>
                                        <Link
                                            href={item.href}
                                            onMouseEnter={() => setHoveredItem(item.name)}
                                            onMouseLeave={() => setHoveredItem(null)}
                                            className={cn(
                                                'relative flex items-center justify-center px-3 py-3 rounded-2xl transition-all duration-300 group',
                                                isActive
                                                    ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-lg'
                                                    : 'hover:bg-gray-100/50 text-gray-700'
                                            )}
                                        >
                                            <GlowEffect color={item.glowColor} isActive={isActive} />

                                            <motion.div
                                                className={cn(
                                                    'relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300',
                                                    isActive ? 'bg-white/20' : ''
                                                )}
                                                animate={{
                                                    scale: isShortcutActive ? [1, 1.2, 1] : 1,
                                                }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <item.icon className={cn(
                                                    'w-5 h-5 transition-all duration-300',
                                                    isActive ? 'text-white' : isHovered ? 'text-gray-900' : 'text-gray-600'
                                                )} />
                                            </motion.div>
                                        </Link>
                                    </PremiumTooltip>
                                ) : (
                                    <Link
                                        href={item.href}
                                        onMouseEnter={() => setHoveredItem(item.name)}
                                        onMouseLeave={() => setHoveredItem(null)}
                                        className={cn(
                                            'relative flex items-center px-3 py-3 rounded-2xl transition-all duration-300 group',
                                            isActive
                                                ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-lg'
                                                : 'hover:bg-gray-100/50 text-gray-700'
                                        )}
                                        style={{
                                            transform: isActive ? 'scale(1.02)' : 'scale(1)',
                                        }}
                                    >
                                        <GlowEffect color={item.glowColor} isActive={isActive} />

                                        {!isActive && isHovered && (
                                            <motion.div
                                                layoutId="hoverBackground"
                                                className={cn('absolute inset-0 rounded-2xl', item.bgColor)}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2, ease: PREMIUM_EASE }}
                                            />
                                        )}

                                        <motion.div
                                            className={cn(
                                                'relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300',
                                                isActive
                                                    ? 'bg-white/20'
                                                    : isHovered
                                                        ? 'bg-gradient-to-r ' + item.color
                                                        : 'bg-gray-100/50'
                                            )}
                                            animate={{
                                                scale: isShortcutActive ? [1, 1.2, 1] : 1,
                                                rotate: isHovered && !isActive ? [0, -5, 5, 0] : 0,
                                            }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <item.icon className={cn(
                                                'w-5 h-5 transition-all duration-300',
                                                isActive || isHovered ? 'text-white' : 'text-gray-600'
                                            )} />
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.2, ease: PREMIUM_EASE }}
                                            className="ml-3 flex-1 flex items-center justify-between"
                                        >
                                            <div>
                                                <p className={cn(
                                                    'font-medium text-sm transition-all duration-300',
                                                    isActive ? 'text-white' : 'text-gray-900'
                                                )}>
                                                    {item.name}
                                                </p>
                                                <AnimatePresence>
                                                    {isHovered && !isActive && (
                                                        <motion.p
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                transition={{ duration: 0.2, ease: PREMIUM_EASE }}
                                                                className="text-xs text-gray-500 mt-0.5 overflow-hidden"
                                                                >
                                                            {item.description}
                                                                </motion.p>
                                                                )}
                                                                </AnimatePresence>
                                                                </div>
                                                            {item.shortcut && (
                                                                <motion.span
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{
                                                                opacity: isHovered ? 1 : 0,
                                                                scale: isHovered ? 1 : 0.8,
                                                            }}
                                                            transition={{ duration: 0.2 }}
                                                            className={cn(
                                                                'text-xs px-2 py-1 rounded-md font-mono',
                                                                isActive
                                                                    ? 'bg-white/20 text-white/80'
                                                                    : 'bg-gray-100 text-gray-500'
                                                            )}
                                                        >
                                                            {item.shortcut}
                                                        </motion.span>
                                                    )}
                                                        </motion.div>
                                                        </Link>
                                                        )}
                                        </motion.div>
                                        );
                                        })}
                                    </nav>

                                    <div className="border-t border-gray-200/20 p-3">
                                    <motion.div
                                    className={cn(
                                    'flex items-center rounded-2xl p-3 mb-2 transition-all duration-300 relative overflow-hidden',
                                    collapsed ? 'justify-center' : 'space-x-3 bg-gradient-to-r from-gray-50/50 to-gray-100/30'
                                    )}
                                whileHover={{ scale: collapsed ? 1 : 1.02 }}
                            >
                                {!collapsed && (
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"
                                        animate={{
                                            x: ['0%', '100%', '0%'],
                                        }}
                                        transition={{
                                            duration: 20,
                                            repeat: Infinity,
                                            ease: "linear",
                                        }}
                                    />
                                )}

                                <div className="relative">
                                    {user.image ? (
                                        <motion.div
                                            className="relative"
                                            whileHover={{ scale: 1.05 }}
                                            transition={{ type: "spring", stiffness: 400 }}
                                        >
                                            <img
                                                src={user.image}
                                                alt={user.name || 'User'}
                                                className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/50 shadow-lg"
                                            />
                                            <motion.div
                                                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"
                                                animate={{
                                                    scale: [1, 1.2, 1],
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                }}
                                            />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden"
                                            whileHover={{ scale: 1.05 }}
                                        >
                                            <motion.div
                                                className="absolute inset-0 bg-white/20"
                                                animate={{
                                                    y: ['100%', '-100%'],
                                                }}
                                                transition={{
                                                    duration: 3,
                                                    repeat: Infinity,
                                                    ease: "linear",
                                                }}
                                            />
                                            <User className="w-6 h-6 text-white relative z-10" />
                                            <motion.div
                                                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"
                                                animate={{
                                                    scale: [1, 1.2, 1],
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                }}
                                            />
                                        </motion.div>
                                    )}
                                </div>

                                <AnimatePresence>
                                    {!collapsed && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="flex-1 min-w-0 relative z-10"
                                        >
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {user.name || 'User'}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {user.email}
                                            </p>
                                            {user.role && (
                                                <motion.span
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-gray-700 mt-1"
                                                >
                                                    {user.role}
                                                </motion.span>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                        <motion.button
                            onClick={handleSignOut}
                            className={cn(
                                'w-full flex items-center rounded-xl p-3 text-sm font-medium transition-all duration-300 group relative overflow-hidden',
                                'hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 hover:text-red-600',
                                'hover:shadow-lg hover:shadow-red-500/10',
                                collapsed ? 'justify-center' : 'space-x-3'
                            )}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-red-500/0 to-rose-500/0 group-hover:from-red-500/10 group-hover:to-rose-500/10 transition-all duration-300"
                            />
                            <LogOut className="w-5 h-5 text-gray-500 group-hover:text-red-600 transition-all duration-300 relative z-10 group-hover:rotate-12" />
                            <AnimatePresence>
                                {!collapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="relative z-10"
                                    >
                                        Sign out
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.button>
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
                                        className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-md"
                                    />
                                    <motion.div
                                        initial={{ x: '-100%' }}
                                        animate={{ x: 0 }}
                                        exit={{ x: '-100%' }}
                                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                        className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-80 bg-white/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
                                        style={{
                                            boxShadow: '10px 0 40px rgba(0, 0, 0, 0.1)',
                                        }}
                                    >
                                        <motion.div
                                            className="absolute inset-0 opacity-30"
                                            style={{
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            }}
                                            animate={{
                                                opacity: [0.1, 0.2, 0.1],
                                            }}
                                            transition={{
                                                duration: 5,
                                                repeat: Infinity,
                                                ease: "easeInOut",
                                            }}
                                        />

                                        <div className="flex flex-col h-full relative z-10">
                                            <div className="h-20 flex items-center justify-between px-6 border-b border-gray-200/20">
                                                <Link href="/dashboard" className="flex items-center space-x-3">
                                                    <motion.div
                                                        className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 relative overflow-hidden"
                                                        whileHover={{ scale: 1.05, rotate: 5 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <motion.div
                                                            className="absolute inset-0 bg-white/30"
                                                            animate={{
                                                                x: ['-100%', '100%'],
                                                            }}
                                                            transition={{
                                                                duration: 2,
                                                                repeat: Infinity,
                                                                ease: "linear",
                                                            }}
                                                        />
                                                        <Zap className="w-7 h-7 text-white relative z-10" />
                                                    </motion.div>
                                                    <div>
                                                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                                                            UniAI
                                                        </h1>
                                                        <p className="text-xs text-gray-500 font-medium">AI Gateway Platform</p>
                                                    </div>
                                                </Link>
                                                <motion.button
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className="p-2.5 rounded-xl hover:bg-gray-100/50 transition-all duration-200"
                                                    whileHover={{ scale: 1.05, rotate: 90 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <X className="w-5 h-5 text-gray-500" />
                                                </motion.button>
                                            </div>

                                            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                                                {navigation.map((item, index) => {
                                                    const isActive = pathname === item.href;

                                                    return (
                                                        <motion.div
                                                            key={item.name}
                                                            initial={{ opacity: 0, x: -50 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: -30 }}
                                                            transition={{
                                                                delay: index * 0.05,
                                                                duration: 0.4,
                                                                ease: PREMIUM_EASE
                                                            }}
                                                        >
                                                            <Link
                                                                href={item.href}
                                                                onClick={() => setMobileMenuOpen(false)}
                                                                className={cn(
                                                                    'flex items-center px-4 py-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden',
                                                                    isActive
                                                                        ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-lg'
                                                                        : 'hover:bg-gray-100/50 text-gray-700'
                                                                )}
                                                            >
                                                                <GlowEffect color={item.glowColor} isActive={isActive} />

                                                                <motion.div
                                                                    className={cn(
                                                                        'flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300',
                                                                        isActive
                                                                            ? 'bg-white/20'
                                                                            : 'bg-gradient-to-br from-gray-100 to-gray-200/50'
                                                                    )}
                                                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                >
                                                                    <item.icon className={cn(
                                                                        'w-6 h-6 transition-all duration-300',
                                                                        isActive ? 'text-white' : 'text-gray-600'
                                                                    )} />
                                                                </motion.div>
                                                                <div className="ml-3 flex-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <p className={cn(
                                                                                'font-semibold text-base transition-all duration-300',
                                                                                isActive ? 'text-white' : 'text-gray-900'
                                                                            )}>
                                                                                {item.name}
                                                                            </p>
                                                                            <p className={cn(
                                                                                'text-xs mt-0.5 transition-all duration-300',
                                                                                isActive ? 'text-white/80' : 'text-gray-500'
                                                                            )}>
                                                                                {item.description}
                                                                            </p>
                                                                        </div>
                                                                        {item.shortcut && (
                                                                            <motion.span
                                                                                initial={{ opacity: 0, scale: 0 }}
                                                                                animate={{ opacity: 1, scale: 1 }}
                                                                                transition={{ delay: 0.2 + index * 0.05 }}
                                                                                className={cn(
                                                                                    'text-xs px-2 py-1 rounded-lg font-mono',
                                                                                    isActive
                                                                                        ? 'bg-white/20 text-white/90'
                                                                                        : 'bg-gray-100 text-gray-500'
                                                                                )}
                                                                            >
                                                                                {item.shortcut}
                                                                            </motion.span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        </motion.div>
                                                    );
                                                })}
                                            </nav>

                                            <motion.div
                                                className="border-t border-gray-200/20 p-4"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3, duration: 0.4, ease: PREMIUM_EASE }}
                                            >
                                                <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-gray-50/50 to-gray-100/30 rounded-2xl mb-3 relative overflow-hidden">
                                                    <motion.div
                                                        className="absolute inset-0 opacity-10"
                                                        style={{
                                                            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%)',
                                                        }}
                                                        animate={{
                                                            scale: [1, 1.2, 1],
                                                        }}
                                                        transition={{
                                                            duration: 4,
                                                            repeat: Infinity,
                                                            ease: "easeInOut",
                                                        }}
                                                    />

                                                    {user.image ? (
                                                        <motion.div
                                                            className="relative"
                                                            whileHover={{ scale: 1.05 }}
                                                        >
                                                            <img
                                                                src={user.image}
                                                                alt={user.name || 'User'}
                                                                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/50 shadow-xl"
                                                            />
                                                            <motion.div
                                                                className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-md"
                                                                animate={{
                                                                    scale: [1, 1.3, 1],
                                                                }}
                                                                transition={{
                                                                    duration: 2,
                                                                    repeat: Infinity,
                                                                    ease: "easeInOut",
                                                                }}
                                                            />
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div
                                                            className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden"
                                                            whileHover={{ scale: 1.05 }}
                                                        >
                                                            <motion.div
                                                                className="absolute inset-0 bg-white/20"
                                                                animate={{
                                                                    y: ['100%', '-100%'],
                                                                }}
                                                                transition={{
                                                                    duration: 3,
                                                                    repeat: Infinity,
                                                                    ease: "linear",
                                                                }}
                                                            />
                                                            <User className="w-8 h-8 text-white relative z-10" />
                                                            <motion.div
                                                                className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-md"
                                                                animate={{
                                                                    scale: [1, 1.3, 1],
                                                                }}
                                                                transition={{
                                                                    duration: 2,
                                                                    repeat: Infinity,
                                                                    ease: "easeInOut",
                                                                }}
                                                            />
                                                        </motion.div>
                                                    )}
                                                    <div className="flex-1 min-w-0 relative z-10">
                                                        <p className="text-base font-bold text-gray-900 truncate">
                                                            {user.name || 'User'}
                                                        </p>
                                                        <p className="text-sm text-gray-500 truncate">
                                                            {user.email}
                                                        </p>
                                                        {user.role && (
                                                            <motion.span
                                                                initial={{ opacity: 0, y: -5 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: 0.5 }}
                                                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-gray-700 mt-1"
                                                            >
                                                                {user.role}
                                                            </motion.span>
                                                        )}
                                                    </div>
                                                </div>

                                                <motion.button
                                                    onClick={handleSignOut}
                                                    className="w-full flex items-center justify-center space-x-3 p-4 bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-red-600 rounded-2xl transition-all duration-300 font-semibold relative overflow-hidden group"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <motion.div
                                                        className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0"
                                                        animate={{
                                                            x: ['-200%', '200%'],
                                                        }}
                                                        transition={{
                                                            duration: 3,
                                                            repeat: Infinity,
                                                            ease: "linear",
                                                        }}
                                                    />
                                                    <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300 relative z-10" />
                                                    <span className="relative z-10">Sign out</span>
                                                </motion.button>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>

            <motion.div
                className={cn(
                    'hidden lg:block transition-all duration-300',
                    collapsed ? 'w-20' : 'w-[280px]'
                )}
                animate={{
                    width: collapsed ? 80 : 280,
                }}
                transition={{ duration: 0.4, ease: PREMIUM_EASE }}
            />
        </>
    );
}