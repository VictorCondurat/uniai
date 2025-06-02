'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Chrome, ArrowRight, Loader2 } from 'lucide-react';
import Link from "next/link";

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError('Invalid email or password');
            } else {
                router.push('/dashboard');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        setError(null);

        try {
            await signIn('google', { callbackUrl: '/dashboard' });
        } catch (error) {
            console.error('Google sign-in error:', error);
            setError('Failed to sign in with Google');
            setIsGoogleLoading(false);
        }
    };

    return (
        <motion.form
            onSubmit={handleSubmit}
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
        >
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-50 border border-red-200/50 text-red-600 rounded-xl text-sm"
                >
                    {error}
                </motion.div>
            )}

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email address
                    </Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 h-12 bg-gray-50 border-gray-200/50 focus:bg-white transition-colors"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                            Password
                        </Label>
                        <a href="#" className="text-sm text-blue-600 hover:text-blue-500">
                            Forgot password?
                        </a>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 h-12 bg-gray-50 border-gray-200/50 focus:bg-white transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium shadow-lg shadow-blue-500/25 transition-all duration-200"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            Sign in
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200/50"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-500">Or continue with</span>
                    </div>
                </div>

                <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200/50 font-medium shadow-sm transition-all duration-200"
                    disabled={isGoogleLoading}
                >
                    {isGoogleLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <Chrome className="w-5 h-5 mr-2" />
                            Sign in with Google
                        </>
                    )}
                </Button>


                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <Link
                            href="/register"
                            className="text-blue-600 hover:text-blue-500 font-medium"
                        >
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </motion.form>
    );
}