'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Shield,
    ArrowRight,
    Loader2,
    RefreshCw,
    CheckCircle,
    Zap,
    Globe,
    BarChart3,
    Sparkles,
    ClipboardPaste
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

export default function VerifyPage() {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const router = useRouter();
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        const storedEmail = sessionStorage.getItem('verificationEmail');
        if (!storedEmail) {
            router.push('/register');
            return;
        }
        setEmail(storedEmail);
        startCountdown();

        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [router]);

    const startCountdown = () => {
        setCountdown(60);
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleCodeChange = (index: number, value: string) => {
        if (value.length > 1) return;

        const newCode = [...code];
        newCode[index] = value.toUpperCase();
        setCode(newCode);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        if (newCode.every(digit => digit) && newCode.length === 6) {
            handleSubmit(newCode.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const processPastedText = (text: string) => {
        const sanitizedText = text.trim().slice(0, 6);
        if (sanitizedText.length === 6) {
            const newCode = sanitizedText.toUpperCase().split('');
            setCode(newCode);
            inputRefs.current[5]?.focus();
            handleSubmit(newCode.join(''));
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        processPastedText(pastedText);
    };

    const handlePasteButtonClick = async () => {
        try {
            const text = await navigator.clipboard.readText();
            processPastedText(text);
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            setError("Clipboard access denied. Please paste the code or type it manually.");
        }
    };

    const handleSubmit = async (codeString?: string) => {
        const verificationCode = codeString || code.join('');
        if (verificationCode.length !== 6) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.post('/api/auth/verify', {
                email,
                code: verificationCode,
            });

            if (response.status === 200) {
                setSuccess(true);
                sessionStorage.removeItem('verificationEmail');
                setTimeout(() => {
                    router.push('/login?verified=true');
                }, 1500);
            }
        } catch (error: any) {
            console.error('Verification error:', error);
            setError(error.response?.data?.error || 'Invalid verification code');
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        setIsResending(true);
        setError(null);

        try {
            await axios.post('/api/auth/resend-code', { email });
            startCountdown();
        } catch (error: any) {
            console.error('Resend code error:', error);
            setError(error.response?.data?.error || 'Failed to resend code');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden bg-gray-50">
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-gray-50 via-white to-gray-50 relative"
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

                <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
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
                                Almost there!
                                <br />
                                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  Verify your email.
                </span>
                            </h2>
                            <p className="text-xl text-gray-600 max-w-2xl">
                                We've sent a verification code to your email address.
                                Enter it to complete your registration and start using UniAI.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="grid grid-cols-2 gap-6"
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
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                className="flex-1 lg:w-1/2 xl:w-2/5 bg-white relative flex items-center justify-center min-h-screen lg:min-h-0"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-50 to-pink-50 rounded-full blur-3xl opacity-50" />

                <div className="relative z-10 w-full max-w-md px-8 py-12">
                    <AnimatePresence mode="wait">
                        {!success ? (
                            <motion.div
                                key="verify"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="flex justify-center mb-8 lg:hidden"
                                >
                                    <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25">
                                        <Shield className="w-8 h-8 text-white" />
                                    </div>
                                </motion.div>

                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                        Verify your email
                                    </h2>
                                    <p className="text-gray-600">
                                        We've sent a code to
                                    </p>
                                    <p className="text-sm font-medium text-blue-600 mt-1">
                                        {email}
                                    </p>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-6 p-3 bg-red-50 border border-red-200/50 text-red-600 rounded-xl text-sm text-center"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <div className="mb-8">
                                    <div className="flex justify-center space-x-3">
                                        {code.map((digit, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: index * 0.05 }}
                                            >
                                                <Input
                                                    ref={el => { inputRefs.current[index] = el }}
                                                    type="text"
                                                    inputMode="text"
                                                    maxLength={1}
                                                    value={digit}
                                                    onChange={(e) => handleCodeChange(index, e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                                    onPaste={handlePaste}
                                                    className="w-12 h-12 text-center text-xl font-semibold bg-gray-50 border-gray-200/50 focus:bg-white focus:border-blue-500 transition-all duration-200"
                                                    style={{ textTransform: 'uppercase' }}
                                                />
                                            </motion.div>
                                        ))}
                                    </div>

                                    <div className="text-center mt-4">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={handlePasteButtonClick}
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                        >
                                            <ClipboardPaste className="w-4 h-4 mr-2" />
                                            Paste Code
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Button
                                        onClick={() => handleSubmit()}
                                        className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium shadow-lg shadow-blue-500/25 transition-all duration-200"
                                        disabled={isLoading || code.some(d => !d)}
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                Verify Email
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>

                                    <div className="text-center">
                                        <p className="text-sm text-gray-600 mb-2">
                                            Didn't receive the code?
                                        </p>
                                        {countdown > 0 ? (
                                            <p className="text-sm text-gray-400">
                                                Resend in {countdown}s
                                            </p>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                onClick={handleResendCode}
                                                disabled={isResending}
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            >
                                                {isResending ? (
                                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                ) : (
                                                    <RefreshCw className="w-4 h-4 mr-2" />
                                                )}
                                                Resend code
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="mt-8 text-center"
                                >
                                    <p className="text-xs text-gray-500">
                                        Need help?{' '}
                                        <a href="#" className="text-blue-600 hover:underline">Contact support</a>
                                    </p>
                                </motion.div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", duration: 0.5 }}
                                    className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"
                                >
                                    <CheckCircle className="w-10 h-10 text-white" />
                                </motion.div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                    Email Verified!
                                </h3>
                                <p className="text-gray-600">
                                    Redirecting to login...
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}