'use client';

import {useState, useEffect, useCallback} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {format, formatDistanceToNow, subDays, startOfDay, endOfDay} from 'date-fns';
import {
    Shield,
    Search,
    Filter,
    Download,
    RefreshCw,
    Activity,
    Key,
    Users,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
    ChevronDown,
    User,
    Layers,
    FileText,
    Copy,
    Lock,
    Database,
    Zap,
    ArrowUpRight,
    ArrowDownRight,
    Hash,
    Laptop,
    Globe2,
    Info,
    LucideIcon,
    ChevronUp,
    MessageSquare,
    Ban,
    WifiOff,
    ShieldAlert,
    Navigation,
    LogIn,
    LogOut,
    AlertTriangle,
    Route,
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {AUDIT_ACTIONS} from '@/types/audit';

const actionConfig: Record<string, ActionCfg> = {
    [AUDIT_ACTIONS.ROUTE_ACCESSED]: {
        icon: Route,
        color: 'from-blue-500 to-cyan-500',
        bgColor: 'bg-blue-500/10',
        label: 'Route Accessed',
        severity: 'info',
    },
    [AUDIT_ACTIONS.USER_AUTH_REDIRECT]: {
        icon: Navigation,
        color: 'from-amber-500 to-orange-500',
        bgColor: 'bg-amber-500/10',
        label: 'Auth Redirect',
        severity: 'info',
    },
    [AUDIT_ACTIONS.USER_AUTH_REQUIRED]: {
        icon: ShieldAlert,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        label: 'Auth Required',
        severity: 'warning',
    },

    [AUDIT_ACTIONS.USER_NAME_CHANGED]: {
        icon: User,
        color: 'from-blue-500 to-cyan-500',
        bgColor: 'bg-blue-500/10',
        label: 'Name Changed',
        severity: 'info',
    },
    [AUDIT_ACTIONS.USER_PASSWORD_CHANGED]: {
        icon: Lock,
        color: 'from-purple-500 to-pink-500',
        bgColor: 'bg-purple-500/10',
        label: 'Password Changed',
        severity: 'warning',
    },
    [AUDIT_ACTIONS.USER_EMAIL_VERIFIED]: {
        icon: CheckCircle,
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-500/10',
        label: 'Email Verified',
        severity: 'info',
    },
    [AUDIT_ACTIONS.USER_LOGIN_SUCCESS]: {
        icon: LogIn,
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-500/10',
        label: 'Login Success',
        severity: 'info',
    },
    [AUDIT_ACTIONS.USER_LOGIN_FAILED]: {
        icon: XCircle,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        label: 'Login Failed',
        severity: 'critical',
    },
    [AUDIT_ACTIONS.USER_LOGOUT]: {
        icon: LogOut,
        color: 'from-gray-500 to-slate-500',
        bgColor: 'bg-gray-500/10',
        label: 'User Logout',
        severity: 'info',
    },

    [AUDIT_ACTIONS.APIKEY_CREATED]: {
        icon: Key,
        color: 'from-emerald-500 to-teal-500',
        bgColor: 'bg-emerald-500/10',
        label: 'API Key Created',
        severity: 'info',
    },
    [AUDIT_ACTIONS.APIKEY_DELETED]: {
        icon: Key,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        label: 'API Key Deleted',
        severity: 'warning'
    },
    [AUDIT_ACTIONS.APIKEY_ACTIVATED]: {
        icon: CheckCircle,
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-500/10',
        label: 'API Key Activated',
        severity: 'info'
    },
    [AUDIT_ACTIONS.APIKEY_DEACTIVATED]: {
        icon: XCircle,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        label: 'API Key Deactivated',
        severity: 'warning'
    },
    [AUDIT_ACTIONS.APIKEY_EXPIRED]: {
        icon: Clock,
        color: 'from-amber-500 to-orange-500',
        bgColor: 'bg-amber-500/10',
        label: 'API Key Expired',
        severity: 'warning'
    },

    [AUDIT_ACTIONS.PROJECT_CREATED]: {
        icon: Layers,
        color: 'from-indigo-500 to-purple-500',
        bgColor: 'bg-indigo-500/10',
        label: 'Project Created',
        severity: 'info'
    },
    [AUDIT_ACTIONS.PROJECT_DELETED]: {
        icon: Layers,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        label: 'Project Deleted',
        severity: 'warning'
    },
    [AUDIT_ACTIONS.PROJECT_MEMBER_ADDED]: {
        icon: Users,
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-500/10',
        label: 'Member Added',
        severity: 'info'
    },
    [AUDIT_ACTIONS.PROJECT_MEMBER_REMOVED]: {
        icon: Users,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        label: 'Member Removed',
        severity: 'warning'
    },

    [AUDIT_ACTIONS.COMPLETION_SUCCESS]: {
        icon: MessageSquare,
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-500/10',
        label: 'Completion Success',
        severity: 'info'
    },
    [AUDIT_ACTIONS.COMPLETION_FAILED]: {
        icon: AlertTriangle,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        label: 'Completion Failed',
        severity: 'critical'
    },
    [AUDIT_ACTIONS.COMPLETION_RATE_LIMITED]: {
        icon: WifiOff,
        color: 'from-amber-500 to-orange-500',
        bgColor: 'bg-amber-500/10',
        label: 'Rate Limited',
        severity: 'warning'
    },

    [AUDIT_ACTIONS.API_REQUEST_UNAUTHORIZED]: {
        icon: Ban,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        label: 'Unauthorized Request',
        severity: 'critical'
    },
    [AUDIT_ACTIONS.API_REQUEST_INVALID_KEY]: {
        icon: Key,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        label: 'Invalid API Key',
        severity: 'critical'
    },

    [AUDIT_ACTIONS.INVOICE_GENERATED]: {
        icon: FileText,
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-500/10',
        label: 'Invoice Generated',
        severity: 'info'
    },
} satisfies Record<string, ActionCfg>;

type Severity = 'info' | 'warning' | 'critical'

interface ActionCfg {
    icon: LucideIcon
    color: string
    bgColor: string
    label: string
    severity: Severity
}

interface AuditLog {
    id: string;
    userId: string;
    user: {
        id: string;
        name: string;
        email: string;
        image?: string;
    };
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    geoLocation?: {
        country?: string;
        region?: string;
        city?: string;
        timezone?: string;
        isp?: string;
    };
    requestId?: string;
    requestType?: string;
    timestamp: string;
}

interface AuditStats {
    summary: {
        total: number;
        trend: number;
        period: string;
    };
    actionStats: Array<{
        action: string;
        count: number;
    }>;
    resourceStats: Array<{
        resource: string;
        count: number;
    }>;
}

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

const defaultConfig: ActionCfg = {
    icon: Activity,
    color: 'from-gray-400 to-gray-500',
    bgColor: 'bg-gray-400/10',
    label: 'Unknown Action',
    severity: 'info',
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAction, setSelectedAction] = useState<string>('');
    const [selectedResource, setSelectedResource] = useState<string>('');
    const [selectedDateRange, setSelectedDateRange] = useState('7d');
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 50,
        total: 0,
        pages: 0,
    });

    const [stats, setStats] = useState<AuditStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    const fetchLogs = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
                page: page.toString(),
                limit: pagination.limit.toString(),
            });

            if (searchQuery) params.append('search', searchQuery);
            if (selectedAction) params.append('action', selectedAction);
            if (selectedResource) params.append('resource', selectedResource);

            if (selectedDateRange !== 'all') {
                const days = parseInt(selectedDateRange.replace('d', '').replace('h', ''));
                const isHours = selectedDateRange.includes('h');
                const endDate = new Date();
                const startDate = isHours ?
                    new Date(endDate.getTime() - days * 60 * 60 * 1000) :
                    subDays(endDate, days);

                params.append('startDate', startDate.toISOString());
                params.append('endDate', endDate.toISOString());
            }

            const response = await fetch(`/api/audit?${params}`);
            if (!response.ok) {
                throw new Error('Failed to fetch audit logs');
            }

            const data = await response.json();
            setLogs(data.logs);
            setPagination(data.pagination);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            console.error('Error fetching audit logs:', err);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, selectedAction, selectedResource, selectedDateRange, pagination.limit]);

    const fetchStats = useCallback(async () => {
        try {
            setStatsLoading(true);
            const days = selectedDateRange === 'all' ? 30 : parseInt(selectedDateRange.replace('d', '').replace('h', ''));
            const response = await fetch(`/api/audit/stats?days=${days}`);

            if (!response.ok) {
                throw new Error('Failed to fetch audit stats');
            }

            const data = await response.json();
            setStats(data);
        } catch (err) {
            console.error('Error fetching audit stats:', err);
        } finally {
            setStatsLoading(false);
        }
    }, [selectedDateRange]);

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchLogs(1);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, selectedAction, selectedResource, selectedDateRange]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchLogs(pagination.page), fetchStats()]);
        setRefreshing(false);
    };

    const handleExport = async () => {
        try {
            const params = new URLSearchParams({
                format: 'csv'
            });

            if (searchQuery) params.append('search', searchQuery);
            if (selectedAction) params.append('action', selectedAction);
            if (selectedResource) params.append('resource', selectedResource);

            if (selectedDateRange !== 'all') {
                const days = parseInt(selectedDateRange.replace('d', '').replace('h', ''));
                const isHours = selectedDateRange.includes('h');
                const endDate = new Date();
                const startDate = isHours ?
                    new Date(endDate.getTime() - days * 60 * 60 * 1000) :
                    subDays(endDate, days);

                params.append('startDate', startDate.toISOString());
                params.append('endDate', endDate.toISOString());
            }

            const response = await fetch(`/api/audit/export?${params}`);
            if (!response.ok) {
                throw new Error('Failed to export audit logs');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error exporting audit logs:', err);
            alert('Failed to export audit logs');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const getSeverityClasses = (severity: 'critical' | 'warning' | 'info') => {
        switch (severity) {
            case 'critical':
                return 'bg-red-50 text-red-700 ring-red-600/20';
            case 'warning':
                return 'bg-amber-50 text-amber-700 ring-amber-600/20';
            case 'info':
            default:
                return 'bg-blue-50 text-blue-700 ring-blue-600/20';
        }
    };

    const getSeverityCount = (severity: Severity) => {
        if (!stats) return 0;
        return stats.actionStats
            .filter(stat => actionConfig[stat.action]?.severity === severity)
            .reduce((sum, stat) => sum + stat.count, 0);
    };

    const availableActions = Object.keys(actionConfig);
    const availableResources = stats?.resourceStats.map(r => r.resource) || [];

    return (
        <div className="flex-1 p-6 lg:p-8 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div
                            className="w-12 h-12 bg-gradient-to-tr from-gray-500 to-slate-500 rounded-xl flex items-center justify-center shadow-lg shadow-gray-500/25">
                            <Shield className="w-7 h-7 text-white"/>
                        </div>
                        Audit Logs
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Complete activity trail and security audit logs for your account.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <motion.button
                        whileHover={{scale: 1.02}}
                        whileTap={{scale: 0.98}}
                        onClick={handleRefresh}
                        disabled={refreshing || loading}
                        className={cn(
                            "px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-700",
                            "hover:bg-gray-50 transition-all duration-200 flex items-center gap-2",
                            (refreshing || loading) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")}/>
                        Refresh
                    </motion.button>

                    <motion.button
                        whileHover={{scale: 1.02}}
                        whileTap={{scale: 0.98}}
                        onClick={handleExport}
                        disabled={loading || logs.length === 0}
                        className={cn(
                            "px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 flex items-center gap-2",
                            (loading || logs.length === 0) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Download className="w-4 h-4"/>
                        Export CSV
                    </motion.button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: 0.1}}
                    className="bg-white rounded-xl border border-gray-200 p-6 relative overflow-hidden shadow-sm"
                >
                    <div
                        className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-bl-full"/>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-600">Total Events</p>
                            <Activity className="w-5 h-5 text-gray-400"/>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {statsLoading ? '...' : stats?.summary.total.toLocaleString() || '0'}
                        </p>
                        <div className="flex items-center gap-1 mt-2">
                            {(stats?.summary.trend || 0) > 0 ? (
                                <ArrowUpRight className="w-4 h-4 text-green-500"/>
                            ) : (
                                <ArrowDownRight className="w-4 h-4 text-red-500"/>
                            )}
                            <span className={cn(
                                "text-sm font-medium",
                                (stats?.summary.trend || 0) > 0 ? "text-green-500" : "text-red-500"
                            )}>
                                {statsLoading ? '...' : `${Math.abs(stats?.summary.trend || 0).toFixed(1)}%`}
                            </span>
                            <span className="text-sm text-gray-500">vs last period</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: 0.2}}
                    className="bg-white rounded-xl border border-gray-200 p-6 relative overflow-hidden shadow-sm"
                >
                    <div
                        className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/10 to-rose-500/10 rounded-bl-full"/>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-600">Critical Events</p>
                            <AlertCircle className="w-5 h-5 text-red-500"/>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {statsLoading ? '...' : getSeverityCount('critical')}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
                            <div
                                className="bg-gradient-to-r from-red-500 to-rose-500 h-1.5 rounded-full"
                                style={{
                                    width: statsLoading ? '0%' :
                                        `${((getSeverityCount('critical') / (stats?.summary.total || 1)) * 100) || 0}%`
                                }}
                            />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: 0.3}}
                    className="bg-white rounded-xl border border-gray-200 p-6 relative overflow-hidden shadow-sm"
                >
                    <div
                        className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-bl-full"/>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-600">Warning Events</p>
                            <AlertCircle className="w-5 h-5 text-amber-500"/>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {statsLoading ? '...' : getSeverityCount('warning')}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
                            <div
                                className="bg-gradient-to-r from-amber-500 to-orange-500 h-1.5 rounded-full"
                                style={{
                                    width: statsLoading ? '0%' :
                                        `${((getSeverityCount('warning') / (stats?.summary.total || 1)) * 100) || 0}%`
                                }}
                            />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: 0.4}}
                    className="bg-white rounded-xl border border-gray-200 p-6 relative overflow-hidden shadow-sm"
                >
                    <div
                        className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-bl-full"/>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-600">Info Events</p>
                            <Info className="w-5 h-5 text-green-500"/>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {statsLoading ? '...' : getSeverityCount('info')}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
                            <div
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full"
                                style={{
                                    width: statsLoading ? '0%' :
                                        `${((getSeverityCount('info') / (stats?.summary.total || 1)) * 100) || 0}%`
                                }}
                            />
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                        <input
                            type="text"
                            placeholder="Search by user, action, resource..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-800 placeholder-gray-400"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "px-4 py-2.5 border border-gray-200 rounded-xl font-medium transition-all duration-200 flex items-center gap-2",
                                showFilters ? "bg-gray-100 text-gray-900" : "bg-white text-gray-700 hover:bg-gray-50"
                            )}
                        >
                            <Filter className="w-4 h-4"/>
                            Filters
                            <ChevronDown className={cn(
                                "w-4 h-4 transition-transform duration-200",
                                showFilters && "rotate-180"
                            )}/>
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{height: 0, opacity: 0}}
                            animate={{height: "auto", opacity: 1}}
                            exit={{height: 0, opacity: 0}}
                            transition={{duration: 0.2}}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                                <div>
                                    <label htmlFor="action-type"
                                           className="block text-sm font-medium text-gray-700 mb-2">
                                        Action Type
                                    </label>
                                    <select
                                        id="action-type"
                                        value={selectedAction}
                                        onChange={(e) => setSelectedAction(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-800"
                                    >
                                        <option value="">All Actions</option>
                                        {availableActions.map((action) => (
                                            <option key={action} value={action}>
                                                {actionConfig[action]?.label || action}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="resource-type"
                                           className="block text-sm font-medium text-gray-700 mb-2">
                                        Resource Type
                                    </label>
                                    <select
                                        id="resource-type"
                                        value={selectedResource}
                                        onChange={(e) => setSelectedResource(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-800"
                                    >
                                        <option value="">All Resources</option>
                                        {availableResources.map((resource) => (
                                            <option key={resource} value={resource}>
                                                {resource.charAt(0).toUpperCase() + resource.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="date-range"
                                           className="block text-sm font-medium text-gray-700 mb-2">
                                        Date Range
                                    </label>
                                    <select
                                        id="date-range"
                                        value={selectedDateRange}
                                        onChange={(e) => setSelectedDateRange(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-gray-800"
                                    >
                                        <option value="24h">Last 24 Hours</option>
                                        <option value="7d">Last 7 Days</option>
                                        <option value="30d">Last 30 Days</option>
                                        <option value="90d">Last 90 Days</option>
                                        <option value="all">All Time</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-5 h-5"/>
                        <span className="font-medium">Error loading audit logs</span>
                    </div>
                    <p className="text-red-600 mt-1">{error}</p>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500 animate-pulse">
                        <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin"/>
                        Loading audit logs...
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Zap className="w-8 h-8 mx-auto mb-3 text-gray-400"/>
                        No audit logs found for the selected filters.
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-gray-200">
                            {logs.map((log, index) => {
                                const config = actionConfig[log.action] ?? defaultConfig
                                const Icon = config.icon;
                                const isExpanded = expandedLog === log.id;

                                return (
                                    <motion.div
                                        key={log.id}
                                        initial={{opacity: 0, y: 20}}
                                        animate={{opacity: 1, y: 0}}
                                        transition={{delay: index * 0.03, duration: 0.3}}
                                        className="p-4 sm:p-6 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-4 flex-grow">
                                                <div className={cn(
                                                    "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                                                    config.bgColor
                                                )}>
                                                    <Icon className="w-5 h-5"/>
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span
                                                            className="text-base font-semibold text-gray-900 truncate">
                                                            {config.label}
                                                        </span>
                                                        <span className={cn(
                                                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                                                            getSeverityClasses(config.severity)
                                                        )}>
                                                            {config.severity[0].toUpperCase() + config.severity.slice(1)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 truncate">
                                                        <span
                                                            className="font-medium text-gray-800">{log.user.name}</span>
                                                        {' '}(<span className="text-gray-500">{log.user.email}</span>)
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex-shrink-0 text-right">
                                                <p className="text-sm text-gray-500">
                                                    {formatDistanceToNow(new Date(log.timestamp), {addSuffix: true})}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                                                </p>
                                                <button
                                                    className="mt-2 text-blue-600 hover:underline text-sm flex items-center gap-1 float-right">
                                                    {isExpanded ? 'Show less' : 'Show more'}
                                                    {isExpanded ? <ChevronUp className="w-4 h-4"/> :
                                                        <ChevronDown className="w-4 h-4"/>}
                                                </button>
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{height: 0, opacity: 0}}
                                                    animate={{height: "auto", opacity: 1}}
                                                    exit={{height: 0, opacity: 0}}
                                                    transition={{duration: 0.2}}
                                                    className="mt-4 pt-4 border-t border-gray-100 overflow-hidden text-sm text-gray-700 space-y-3"
                                                >
                                                    {log.resource && (
                                                        <div className="flex items-center gap-2">
                                                            <Database className="w-4 h-4 text-gray-500 flex-shrink-0"/>
                                                            <span
                                                                className="font-medium">Resource:</span> {log.resource}
                                                            {log.resourceId && (
                                                                <div className="flex items-center gap-1 text-gray-500">
                                                                    <Hash className="w-3.5 h-3.5"/>
                                                                    <span
                                                                        className="truncate max-w-[150px] sm:max-w-xs">
                                                                        {log.resourceId}
                                                                    </span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            copyToClipboard(log.resourceId!);
                                                                        }}
                                                                        className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                                                                        title="Copy Resource ID"
                                                                    >
                                                                        <Copy className="w-3.5 h-3.5"/>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {log.ipAddress && (
                                                        <div className="flex items-center gap-2">
                                                            <Globe2 className="w-4 h-4 text-gray-500 flex-shrink-0"/>
                                                            <span
                                                                className="font-medium">IP Address:</span> {log.ipAddress}
                                                            {log.geoLocation && (
                                                                <span className="text-gray-500">
                                                                    ({log.geoLocation.city}, {log.geoLocation.country})
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    copyToClipboard(log.ipAddress!);
                                                                }}
                                                                className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                                                                title="Copy IP Address"
                                                            >
                                                                <Copy className="w-3.5 h-3.5"/>
                                                            </button>
                                                        </div>
                                                    )}

                                                    {log.userAgent && (
                                                        <div className="flex items-center gap-2">
                                                            <Laptop className="w-4 h-4 text-gray-500 flex-shrink-0"/>
                                                            <span className="font-medium">User Agent:</span>
                                                            <span className="break-all text-xs">{log.userAgent}</span>
                                                        </div>
                                                    )}

                                                    {log.requestId && (
                                                        <div className="flex items-center gap-2">
                                                            <Hash className="w-4 h-4 text-gray-500 flex-shrink-0"/>
                                                            <span className="font-medium">Request ID:</span>
                                                            <span className="text-xs font-mono">{log.requestId}</span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    copyToClipboard(log.requestId!);
                                                                }}
                                                                className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                                                                title="Copy Request ID"
                                                            >
                                                                <Copy className="w-3.5 h-3.5"/>
                                                            </button>
                                                        </div>
                                                    )}

                                                    {log.details && Object.keys(log.details).length > 0 && (
                                                        <div>
                                                            <span className="font-medium">Details:</span>
                                                            <pre
                                                                className="mt-2 bg-gray-50 p-3 rounded-lg overflow-x-auto text-xs text-gray-800 border border-gray-100">
                                                                {JSON.stringify(log.details, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {pagination.pages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                                <div className="text-sm text-gray-500">
                                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => fetchLogs(pagination.page - 1)}
                                        disabled={pagination.page <= 1 || loading}
                                        className={cn(
                                            "px-3 py-1.5 text-sm border border-gray-200 rounded-lg transition-colors",
                                            pagination.page <= 1 || loading
                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                : "bg-white text-gray-700 hover:bg-gray-50"
                                        )}
                                    >
                                        Previous
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                                            let pageNum;
                                            if (pagination.pages <= 5) {
                                                pageNum = i + 1;
                                            } else if (pagination.page <= 3) {
                                                pageNum = i + 1;
                                            } else if (pagination.page >= pagination.pages - 2) {
                                                pageNum = pagination.pages - 4 + i;
                                            } else {
                                                pageNum = pagination.page - 2 + i;
                                            }

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => fetchLogs(pageNum)}
                                                    disabled={loading}
                                                    className={cn(
                                                        "px-3 py-1.5 text-sm rounded-lg transition-colors",
                                                        pageNum === pagination.page
                                                            ? "bg-blue-600 text-white"
                                                            : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
                                                    )}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => fetchLogs(pagination.page + 1)}
                                        disabled={pagination.page >= pagination.pages || loading}
                                        className={cn(
                                            "px-3 py-1.5 text-sm border border-gray-200 rounded-lg transition-colors",
                                            pagination.page >= pagination.pages || loading
                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                : "bg-white text-gray-700 hover:bg-gray-50"
                                        )}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}