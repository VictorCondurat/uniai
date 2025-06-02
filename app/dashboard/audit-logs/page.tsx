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
    Settings,
    Users,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
    Calendar,
    ChevronDown,
    ChevronRight,
    User,
    Layers,
    CreditCard,
    FileText,
    Eye,
    Copy,
    ExternalLink,
    Sparkles,
    TrendingUp,
    Globe,
    Lock,
    Unlock,
    Database,
    Zap,
    ArrowUpRight,
    ArrowDownRight,
    Hash,
    Laptop,
    Globe2,
    Info, LucideIcon, ChevronUp,
} from 'lucide-react';
import {cn} from '@/lib/utils';

const actionConfig: Record<string, ActionCfg> = {
    'api_key_created': {
        icon: Key,
        color: 'from-emerald-500 to-teal-500',
        bgColor: 'bg-emerald-500/10',
        label: 'API Key Created',
        severity: 'info',
    },
    'api_key_deleted': {
        icon: Key,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        label: 'API Key Deleted',
        severity: 'warning'
    },
    'api_key_regenerated': {
        icon: RefreshCw,
        color: 'from-amber-500 to-orange-500',
        bgColor: 'bg-amber-500/10',
        label: 'API Key Regenerated',
        severity: 'warning'
    },
    'model_called': {
        icon: Sparkles,
        color: 'from-purple-500 to-pink-500',
        bgColor: 'bg-purple-500/10',
        label: 'Model Called',
        severity: 'info'
    },
    'settings_changed': {
        icon: Settings,
        color: 'from-blue-500 to-cyan-500',
        bgColor: 'bg-blue-500/10',
        label: 'Settings Updated',
        severity: 'info'
    },
    'spending_limit_updated': {
        icon: CreditCard,
        color: 'from-indigo-500 to-purple-500',
        bgColor: 'bg-indigo-500/10',
        label: 'Spending Limit Updated',
        severity: 'warning'
    },
    'team_member_added': {
        icon: Users,
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-500/10',
        label: 'Team Member Added',
        severity: 'info'
    },
    'team_member_removed': {
        icon: Users,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        label: 'Team Member Removed',
        severity: 'warning'
    },
    'project_created': {
        icon: Layers,
        color: 'from-indigo-500 to-purple-500',
        bgColor: 'bg-indigo-500/10',
        label: 'Project Created',
        severity: 'info'
    },
    'invoice_generated': {
        icon: FileText,
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-500/10',
        label: 'Invoice Generated',
        severity: 'info'
    },
    'alert_triggered': {
        icon: AlertCircle,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        label: 'Alert Triggered',
        severity: 'critical'
    },
    'login_success': {
        icon: CheckCircle,
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-500/10',
        label: 'Login Success',
        severity: 'info'
    },
    'login_failed': {
        icon: XCircle,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        label: 'Login Failed',
        severity: 'critical'
    },
    'permission_granted': {
        icon: Unlock,
        color: 'from-green-500 to-emerald-500',
        bgColor: 'bg-green-500/10',
        label: 'Permission Granted',
        severity: 'info'
    },
    'permission_revoked': {
        icon: Lock,
        color: 'from-red-500 to-rose-500',
        bgColor: 'bg-red-500/10',
        label: 'Permission Revoked',
        severity: 'warning'
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
        name: string;
        email: string;
        image?: string;
    };
    action: keyof typeof actionConfig;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
}

const defaultConfig: ActionCfg = {
    icon: Activity,
    color: 'from-gray-400 to-gray-500',
    bgColor: 'bg-gray-400/10',
    label: 'Unknown Action',
    severity: 'info',
}
const generateMockLogs = (count: number): AuditLog[] => {
    const actions = Object.keys(actionConfig) as Array<keyof typeof actionConfig>;
    const resources = ['api_key', 'project', 'team', 'settings', 'model', 'invoice'];
    const users = [
        {name: 'John Doe', email: 'john@example.com'},
        {name: 'Jane Smith', email: 'jane@example.com'},
        {name: 'Mike Johnson', email: 'mike@example.com'},
        {name: 'Sarah Wilson', email: 'sarah@example.com'},
    ];

    return Array.from({length: count}, (_, i) => ({
        id: `log-${i + 1}`,
        userId: `user-${(i % 4) + 1}`,
        user: users[i % users.length],
        action: actions[Math.floor(Math.random() * actions.length)],
        resource: resources[Math.floor(Math.random() * resources.length)],
        resourceId: Math.random() > 0.3 ? `${resources[Math.floor(Math.random() * resources.length)]}-${Math.floor(Math.random() * 1000)}` : undefined,
        details: {
            oldValue: Math.random() > 0.5 ? 'Previous Value' : undefined,
            newValue: Math.random() > 0.5 ? 'New Value' : undefined,
            model: Math.random() > 0.5 ? 'gpt-4' : 'claude-3',
            cost: Math.random() * 10,
            changes: Math.random() > 0.5 ? ['autoModelEnabled', 'spendingLimit'] : undefined,
        },
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
    }));
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAction, setSelectedAction] = useState<string>('all');
    const [selectedDateRange, setSelectedDateRange] = useState('7d');
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [stats, setStats] = useState({
        total: 0,
        critical: 0,
        warning: 0,
        info: 0,
        trend: 12.5,
    });

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1000));
            const mockLogs = generateMockLogs(150);
            setLogs(mockLogs);
            setFilteredLogs(mockLogs);

            const critical = mockLogs.filter(log => actionConfig[log.action].severity === 'critical').length;
            const warning = mockLogs.filter(log => actionConfig[log.action].severity === 'warning').length;
            const info = mockLogs.filter(log => actionConfig[log.action].severity === 'info').length;

            setStats({
                total: mockLogs.length,
                critical,
                warning,
                info,
                trend: Math.random() * 30 - 15,
            });

            setLoading(false);
        };

        fetchLogs();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockLogs = generateMockLogs(150);
        setLogs(mockLogs);
        applyFilters(mockLogs, searchQuery, selectedAction, selectedDateRange);
        setRefreshing(false);
    };

    const applyFilters = useCallback((
        logsToFilter: AuditLog[],
        search: string,
        action: string,
        dateRange: string
    ) => {
        let filtered = [...logsToFilter];

        if (search) {
            filtered = filtered.filter(log =>
                log.user.name.toLowerCase().includes(search.toLowerCase()) ||
                log.user.email.toLowerCase().includes(search.toLowerCase()) ||
                log.resource.toLowerCase().includes(search.toLowerCase()) ||
                log.resourceId?.toLowerCase().includes(search.toLowerCase()) ||
                actionConfig[log.action].label.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (action !== 'all') {
            filtered = filtered.filter(log => log.action === action);
        }

        const now = new Date();
        let startDate: Date;

        switch (dateRange) {
            case '24h':
                startDate = subDays(now, 1);
                break;
            case '7d':
                startDate = subDays(now, 7);
                break;
            case '30d':
                startDate = subDays(now, 30);
                break;
            case '90d':
                startDate = subDays(now, 90);
                break;
            default:
                startDate = subDays(now, 7);
        }

        filtered = filtered.filter(log => new Date(log.timestamp) >= startDate);

        filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        setFilteredLogs(filtered);
    }, []);

    useEffect(() => {
        applyFilters(logs, searchQuery, selectedAction, selectedDateRange);
    }, [logs, searchQuery, selectedAction, selectedDateRange, applyFilters]);

    const handleExport = () => {
        const csvContent = [
            ['Timestamp', 'User', 'Action', 'Resource', 'Resource ID', 'IP Address', 'User Agent', 'Details'].join(','),
            ...filteredLogs.map(log => [
                format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                log.user.email,
                actionConfig[log.action].label,
                log.resource,
                log.resourceId || '',
                log.ipAddress || '',
                log.userAgent || '',
                JSON.stringify(log.details || {})
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], {type: 'text/csv'});
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `uni-ai-audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url); // Clean up
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
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
                        disabled={loading || filteredLogs.length === 0}
                        className={cn(
                            "px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-200 flex items-center gap-2",
                            (loading || filteredLogs.length === 0) && "opacity-50 cursor-not-allowed"
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
                        <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.total.toLocaleString()}</p>
                        <div className="flex items-center gap-1 mt-2">
                            {stats.trend > 0 ? (
                                <ArrowUpRight className="w-4 h-4 text-green-500"/>
                            ) : (
                                <ArrowDownRight className="w-4 h-4 text-red-500"/>
                            )}
                            <span className={cn(
                                "text-sm font-medium",
                                stats.trend > 0 ? "text-green-500" : "text-red-500"
                            )}>
                                {loading ? '...' : `${Math.abs(stats.trend).toFixed(1)}%`}
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
                        <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.critical}</p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
                            <div
                                className="bg-gradient-to-r from-red-500 to-rose-500 h-1.5 rounded-full"
                                style={{width: loading ? '0%' : `${(stats.critical / stats.total) * 100 || 0}%`}}
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
                        <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.warning}</p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
                            <div
                                className="bg-gradient-to-r from-amber-500 to-orange-500 h-1.5 rounded-full"
                                style={{width: loading ? '0%' : `${(stats.warning / stats.total) * 100 || 0}%`}}
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
                        <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.info}</p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-3">
                            <div
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full"
                                style={{width: loading ? '0%' : `${(stats.info / stats.total) * 100 || 0}%`}}
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
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
                                        <option value="all">All Actions</option>
                                        {Object.entries(actionConfig).map(([key, config]) => (
                                            <option key={key} value={key}>
                                                {config.label}
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

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500 animate-pulse">
                        <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin"/>
                        Loading audit logs...
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Zap className="w-8 h-8 mx-auto mb-3 text-gray-400"/>
                        No audit logs found for the selected filters.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredLogs.map((log, index) => {
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
                                                <Icon
                                                    className={cn("w-5 h-5", `text-[${config.color.split(' ')[0].replace('from-', '')}]`)}/>
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-base font-semibold text-gray-900 truncate">
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
                                                    <span className="font-medium text-gray-800">{log.user.name}</span> (<span
                                                    className="text-gray-500">{log.user.email}</span>)
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
                                                        <span className="font-medium">Resource:</span> {log.resource}
                                                        {log.resourceId && (
                                                            <div className="flex items-center gap-1 text-gray-500">
                                                                <Hash className="w-3.5 h-3.5"/>
                                                                <span
                                                                    className="truncate max-w-[150px] sm:max-w-xs">{log.resourceId}</span>
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
                                                        <span className="font-medium">IP Address:</span> {log.ipAddress}
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
                                                        <span className="font-medium">User Agent:</span> <span
                                                        className="break-all">{log.userAgent}</span>
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
                )}
            </div>
        </div>
    );
}