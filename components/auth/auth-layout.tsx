'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';
import {
    Zap,
    Shield,
    BarChart3,
    Sparkles,
    Globe,
} from 'lucide-react';

const features = [
    {
        icon: Globe,
        title: 'Unified API Gateway',
        description: 'Access OpenAI, Anthropic, and Google AI through one interface',
        color: 'from-blue-500 to-cyan-500'
    },
    {
        icon: Shield,
        title: 'Enterprise Security',
        description: 'SOC 2 compliant with advanced audit logging and access controls',
        color: 'from-emerald-500 to-teal-500'
    },
    {
        icon: BarChart3,
        title: 'Real-time Analytics',
        description: 'Monitor usage, costs, and performance across all providers',
        color: 'from-purple-500 to-pink-500'
    },
    {
        icon: Sparkles,
        title: 'Smart Routing',
        description: 'Automatic failover and intelligent model selection',
        color: 'from-amber-500 to-orange-500'
    }
];

const stats = [
    { value: '99.9%', label: 'Uptime SLA' },
    { value: '50ms', label: 'Avg Latency' },
    { value: '10M+', label: 'API Calls/Day' },
    { value: '500+', label: 'Active Teams' }
];

interface AuthLayoutProps {
    mode: 'login' | 'register';
}

export function AuthLayout({ mode: initialMode }: AuthLayoutProps) {
    const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setAuthMode(initialMode);
    }, [initialMode]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="min-h-screen flex overflow-hidden bg-gray-50 align-items-center justify-center">
            <div className="hidden lg:flex w-full">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    className="w-1/2 xl:w-3/5 bg-gradient-to-br from-gray-50 via-white to-gray-50 relative"
                >
                    <div className="absolute inset-0 overflow-hidden">
                        <motion.div
                            className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"
                            animate={{
                                x: mousePosition.x * 0.05,
                                y: mousePosition.y * 0.05,
                            }}
                            transition={{ type: "spring", damping: 30, stiffness: 100 }}
                        />
                        <motion.div
                            className="absolute -bottom-40 -right-40 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
                            animate={{
                                x: mousePosition.x * -0.05,
                                y: mousePosition.y * -0.05,
                            }}
                            transition={{ type: "spring", damping: 30, stiffness: 100 }}
                        />
                    </div>

                    <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full h-full">
                        <div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center space-x-3 mb-12"
                            >
                                <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-xl shadow-blue-500/25">
                                    <Zap className="w-7 h-7 text-white" />
                                </div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                                    UniAI
                                </h1>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="space-y-6 mb-12"
                            >
                                <h2 className="text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
                                    One API Gateway.
                                    <br />
                                    <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                                        All AI Providers.
                                    </span>
                                </h2>
                                <p className="text-xl text-gray-600 max-w-2xl">
                                    Simplify your AI infrastructure with unified access to OpenAI, Anthropic,
                                    and Google AI. Built for developers who demand reliability, scalability,
                                    and comprehensive analytics.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="grid grid-cols-2 gap-6 mb-12"
                            >
                                {features.map((feature, index) => (
                                    <motion.div
                                        key={feature.title}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 + index * 0.1 }}
                                        whileHover={{ scale: 1.02 }}
                                        className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300"
                                    >
                                        <div className={`w-10 h-10 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                                            <feature.icon className="w-5 h-5 text-white" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {feature.title}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {feature.description}
                                        </p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="flex items-center justify-between pt-8 border-t border-gray-200/50"
                        >
                            {stats.map((stat, index) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.9 + index * 0.1 }}
                                    className="text-center"
                                >
                                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                                        {stat.value}
                                    </div>
                                    <div className="text-sm text-gray-600">{stat.label}</div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    className="w-1/2 xl:w-2/5 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-50 relative flex items-center justify-center"
                >
                    <div className="absolute inset-0 bg-grid-slate/[0.02] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,1))]" />

                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-100/50 to-cyan-100/50 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-100/50 to-pink-100/50 rounded-full blur-3xl" />

                    <div className="absolute inset-0 bg-white/30 backdrop-blur-[1px]" />

                    <div className="relative z-10 w-full max-w-md px-8 py-12">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex justify-center mb-8"
                        >
                            <div className="inline-flex rounded-xl bg-white/80 backdrop-blur-sm p-1 shadow-sm border border-gray-200/50">
                                <button
                                    onClick={() => setAuthMode('login')}
                                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        authMode === 'login'
                                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    Sign In
                                </button>
                                <button
                                    onClick={() => setAuthMode('register')}
                                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        authMode === 'register'
                                            ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    Sign Up
                                </button>
                            </div>
                        </motion.div>

                        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/20 p-8 border border-gray-200/50">
                            <AnimatePresence mode="wait">
                                {authMode === 'login' ? (
                                    <motion.div
                                        key="login"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="text-center mb-8">
                                            <h2 className="text-3xl font-bold text-gray-900">
                                                Welcome back
                                            </h2>
                                            <p className="mt-2 text-sm text-gray-600">
                                                Sign in to access your AI gateway
                                            </p>
                                        </div>
                                        <LoginForm />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="register"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="text-center mb-8">
                                            <h2 className="text-3xl font-bold text-gray-900">
                                                Get started free
                                            </h2>
                                            <p className="mt-2 text-sm text-gray-600">
                                                Create your account in seconds
                                            </p>
                                        </div>
                                        <RegisterForm />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-6 text-center"
                        >
                            <p className="text-xs text-gray-500">
                                By signing up, you agree to our{' '}
                                <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
                                {' '}and{' '}
                                <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                            </p>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
            <div className="lg:hidden w-full max-w-md px-6 align-items-center justify-center flex flex-col space-y-8 py-12">
            <div className="w-full max-w-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex justify-center mb-8"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                                UniAI
                            </h1>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-center mb-8"
                    >
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            One API Gateway.
                            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    {' '}All AI Providers.
                </span>
                        </h2>
                        <p className="text-sm text-gray-600">
                            Access multiple AI providers through one unified API
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex justify-center mb-6"
                    >
                        <div className="inline-flex rounded-xl bg-white/80 backdrop-blur-sm p-1 shadow-sm border border-gray-200/50">
                            <button
                                onClick={() => setAuthMode('login')}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    authMode === 'login'
                                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm'
                                        : 'text-gray-600'
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => setAuthMode('register')}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    authMode === 'register'
                                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm'
                                        : 'text-gray-600'
                                }`}
                            >
                                Sign Up
                            </button>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-gray-200/20 p-6 sm:p-8 border border-gray-200/50"
                    >
                        <AnimatePresence mode="wait">
                            {authMode === 'login' ? (
                                <motion.div
                                    key="login-mobile"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="text-center mb-6">
                                        <h3 className="text-xl font-bold text-gray-900">
                                            Welcome back
                                        </h3>
                                        <p className="mt-1 text-sm text-gray-600">
                                            Sign in to your account
                                        </p>
                                    </div>
                                    <LoginForm />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="register-mobile"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="text-center mb-6">
                                        <h3 className="text-xl font-bold text-gray-900">
                                            Get started free
                                        </h3>
                                        <p className="mt-1 text-sm text-gray-600">
                                            Create your account
                                        </p>
                                    </div>
                                    <RegisterForm />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="mt-6 text-center"
                    >
                        <p className="text-xs text-gray-500">
                            By signing up, you agree to our{' '}
                            <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
                            {' '}and{' '}
                            <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}