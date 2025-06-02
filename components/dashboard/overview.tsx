'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Database,
    CreditCard,
    Key,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    Zap,
    Info,
} from 'lucide-react';


interface OverviewData {
    totalRequests: number;
    totalTokens: number;
    currentCost: number;
    activeKeys: number;
    keysInUse: number;
    percentageChanges: {
        cost: number;
        requests: number;
        tokens: number;
    };
}

export function DashboardOverview() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<OverviewData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchOverviewData() {
            try {
                setLoading(true);
                setError(null);
                const response = await axios.get<OverviewData>('/api/dashboard/overview');
                setData(response.data);
            } catch (err) {
                console.error('Error fetching overview data:', err);
                if (axios.isAxiosError(err) && err.response) {
                    setError(`Failed to load overview data: ${err.response.status} - ${err.response.statusText}`);
                } else {
                    setError('Failed to load overview data. Please check your network connection or try again later.');
                }
            } finally {
                setLoading(false);
            }
        }

        fetchOverviewData();
    }, []);

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const formatPercentageChange = (value: number) => {
        if (typeof value !== 'number' || isNaN(value)) {
            return <p className="text-sm text-gray-500">N/A</p>;
        }
        const isPositive = value >= 0;
        const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
        const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

        return (
            <p className={`text-sm ${colorClass} flex items-center gap-1 mt-1 font-medium`}>
                <Icon className="w-4 h-4" />
                {value.toFixed(1)}% vs last month
            </p>
        );
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="p-6 relative overflow-hidden shadow-sm animate-pulse min-h-[140px] flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-100 rounded-bl-full" />
                        <div className="relative space-y-3">
                            <div className="h-5 bg-gray-200 rounded w-3/5"></div>
                            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3 shadow-sm"
            >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{error}</span>
            </motion.div>
        );
    }

    if (!data) {
        return (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-6 py-4 rounded-xl flex items-center gap-3 shadow-sm">
                <Info className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">No overview data available.</span>
            </div>
        );
    }

    return (
        <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
                visible: {
                    transition: {
                        staggerChildren: 0.1, // Stagger animation for each card
                    },
                },
            }}
        >
            <motion.div variants={cardVariants} className="relative overflow-hidden">
                <Card className="p-6 h-full relative overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-bl-full" />
                    <div className="relative flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-600">Total Requests</h3>
                            <Activity className="w-6 h-6 text-blue-500 flex-shrink-0" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                            {data.totalRequests.toLocaleString()}
                        </p>
                        {formatPercentageChange(data.percentageChanges.requests)}
                    </div>
                </Card>
            </motion.div>

            <motion.div variants={cardVariants} className="relative overflow-hidden">
                <Card className="p-6 h-full relative overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-bl-full" />
                    <div className="relative flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-600">Total Tokens</h3>
                            <Database className="w-6 h-6 text-purple-500 flex-shrink-0" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                            {data.totalTokens >= 1_000_000_000 ? `${(data.totalTokens / 1_000_000_000).toFixed(1)}B` :
                                data.totalTokens >= 1_000_000 ? `${(data.totalTokens / 1_000_000).toFixed(1)}M` :
                                    data.totalTokens >= 1_000 ? `${(data.totalTokens / 1_000).toFixed(1)}K` :
                                        data.totalTokens.toLocaleString()}
                        </p>
                        {formatPercentageChange(data.percentageChanges.tokens)}
                    </div>
                </Card>
            </motion.div>

            <motion.div variants={cardVariants} className="relative overflow-hidden">
                <Card className="p-6 h-full relative overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-bl-full" />
                    <div className="relative flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-600">Current Month Cost</h3>
                            <CreditCard className="w-6 h-6 text-green-500 flex-shrink-0" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                            ${data.currentCost.toFixed(2)}
                        </p>
                        {formatPercentageChange(data.percentageChanges.cost)}
                    </div>
                </Card>
            </motion.div>

            <motion.div variants={cardVariants} className="relative overflow-hidden">
                <Card className="p-6 h-full relative overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-bl-full" />
                    <div className="relative flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-600">Active API Keys</h3>
                            <Key className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                            {data.activeKeys.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                            <span className="font-medium text-gray-800">{data.keysInUse.toLocaleString()}</span> currently in use
                        </p>
                    </div>
                </Card>
            </motion.div>
        </motion.div>
    );
}