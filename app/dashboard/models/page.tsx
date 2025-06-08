'use client';

import {useState, useEffect, useCallback} from 'react';
import axios from 'axios';
import {motion, AnimatePresence} from 'framer-motion';
import {
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {Input} from '@/components/ui/input';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {toast} from 'sonner';
import {
    Cpu, Zap, DollarSign, Search, BrainCircuit, Sparkles, BookOpen,
     Shield, Globe, ChevronRight,
     Eye, Copy,  Check, X, Code2,
    Wand2,  Gem, FlaskConical, Bot, Terminal, Hash,
    FileText, Image, Mic, Video, MessageSquare, PenTool,
    Loader2, Grid3x3, List, ArrowUpDown,
} from 'lucide-react';
import {cn} from '@/lib/utils';

interface ModelProvider {
    id: string;
    name: string;
    icon?: string;
    models: Model[];
}

interface Model {
    id: string;
    name: string;
    provider: string;
    description: string;
    capabilities: string[];
    contextWindow?: string;
    pricing?: string;
    performance: {
        cost: number,
        speed: number,
        quality: number,
        label: string
    },

    status: 'available' | 'beta' | 'deprecated';
}

const capabilityIcons: Record<string, { icon: React.ElementType; color: string }> = {
    'text-generation': {icon: FileText, color: 'text-blue-500'},
    'chat': {icon: MessageSquare, color: 'text-green-500'},
    'vision': {icon: Image, color: 'text-purple-500'},
    'audio': {icon: Mic, color: 'text-orange-500'},
    'video': {icon: Video, color: 'text-red-500'},
    'code': {icon: Code2, color: 'text-indigo-500'},
    'function-calling': {icon: Terminal, color: 'text-yellow-600'},
    'embeddings': {icon: Hash, color: 'text-pink-500'},
    'fine-tuning': {icon: PenTool, color: 'text-teal-500'},
    'streaming': {icon: Zap, color: 'text-amber-500'},
};

const providerConfig: Record<string, {
    color: string;
    icon: React.ElementType;
    gradient: string;
    pattern?: string;
}> = {
    openai: {
        color: 'text-emerald-600',
        icon: Bot,
        gradient: 'from-emerald-400 via-green-400 to-teal-400',
        pattern: 'bg-gradient-to-br from-emerald-50 to-green-50'
    },
    anthropic: {
        color: 'text-purple-600',
        icon: BrainCircuit,
        gradient: 'from-purple-400 via-pink-400 to-rose-400',
        pattern: 'bg-gradient-to-br from-purple-50 to-pink-50'
    },
    google: {
        color: 'text-blue-600',
        icon: Sparkles,
        gradient: 'from-blue-400 via-cyan-400 to-sky-400',
        pattern: 'bg-gradient-to-br from-blue-50 to-cyan-50'
    },
    meta: {
        color: 'text-indigo-600',
        icon: Globe,
        gradient: 'from-indigo-400 via-blue-400 to-purple-400',
        pattern: 'bg-gradient-to-br from-indigo-50 to-blue-50'
    },
    mistral: {
        color: 'text-orange-600',
        icon: Wand2,
        gradient: 'from-orange-400 via-amber-400 to-yellow-400',
        pattern: 'bg-gradient-to-br from-orange-50 to-amber-50'
    },
};

export default function ModelsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [modelProviders, setModelProviders] = useState<ModelProvider[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [providerFilter, setProviderFilter] = useState('all');
    const [capabilityFilter, setCapabilityFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedModel, setSelectedModel] = useState<{ model: Model; providerId: string } | null>(null);
    const [sortBy, setSortBy] = useState<'name' | 'provider' | 'performance'>('name');

    const fetchModels = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get<ModelProvider[]>('/api/models');
            setModelProviders(response.data);
        } catch (error) {
            console.error('Failed to fetch models:', error);
            toast.error('Could not load model data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchModels();
    }, [fetchModels]);

    const allCapabilities = Array.from(new Set(
        modelProviders.flatMap(p => p.models.flatMap(m => m.capabilities))
    ));

    const filteredAndSortedProviders = modelProviders
        .map(provider => ({
            ...provider,
            models: provider.models
                .filter(model => {
                    const matchesSearch = searchTerm === '' ||
                        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        model.description.toLowerCase().includes(searchTerm.toLowerCase());

                    const matchesCapability = capabilityFilter === 'all' ||
                        model.capabilities.includes(capabilityFilter);

                    const matchesStatus = statusFilter === 'all' ||
                        model.status === statusFilter;

                    return matchesSearch && matchesCapability && matchesStatus;
                })
                .sort((a, b) => {
                    if (sortBy === 'name') return a.name.localeCompare(b.name);
                    if (sortBy === 'provider') return a.provider.localeCompare(b.provider);
                    if (sortBy === 'performance') {
                        return (b.performance.speed + b.performance.quality) - (a.performance.speed + a.performance.quality);
                    }
                    return 0;
                })
        }))
        .filter(provider =>
            (providerFilter === 'all' || provider.id === providerFilter) &&
            provider.models.length > 0
        );

    const handleCopyModelId = (modelId: string) => {
        navigator.clipboard.writeText(modelId);
        toast.success('Model ID copied to clipboard', {
            icon: <Check className="w-4 h-4"/>,
        });
    };

    const ModelCard = ({model, provider}: { model: Model; provider: ModelProvider }) => {
        const config = providerConfig[provider.id] || {
            color: 'text-gray-600',
            icon: Bot,
            gradient: 'from-gray-400 to-gray-500',
            pattern: 'bg-gradient-to-br from-gray-50 to-gray-100'
        };
        const Icon = config.icon;
        const metrics = model.performance

        return (
            <motion.div
                layout
                initial={{opacity: 0, scale: 0.95}}
                animate={{opacity: 1, scale: 1}}
                exit={{opacity: 0, scale: 0.95}}
                whileHover={{y: -2}}
                transition={{duration: 0.2}}
                className="h-full"
            >
                <Card className={cn(
                    "group relative h-full flex flex-col overflow-hidden border-0 shadow-lg",
                    "hover:shadow-xl transition-all duration-300",
                    "bg-white/80 backdrop-blur-sm"
                )}>
                    <div className={cn(
                        "absolute inset-0 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity",
                        config.pattern,
                        "pointer-events-none"
                    )}/>

                    {model.status !== 'available' && (
                        <div className={cn(
                            "absolute top-3 right-3 z-10",
                            model.status === 'beta' ? 'text-amber-600' : 'text-red-600'
                        )}>
                            <Badge
                                variant={model.status === 'beta' ? 'warning' : 'destructive'}
                                className="shadow-md"
                            >
                                {model.status === 'beta' ? <FlaskConical className="w-3 h-3 mr-1"/> :
                                    <X className="w-3 h-3 mr-1"/>}
                                {model.status}
                            </Badge>
                        </div>
                    )}

                    <CardHeader className="relative">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-lg bg-gradient-to-br text-white shadow-md",
                                    config.gradient
                                )}>
                                    <Icon className="w-5 h-5"/>
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        {model.name}
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={() => handleCopyModelId(model.id)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Copy className="w-4 h-4 text-gray-400 hover:text-gray-600"/>
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>Copy model ID</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </CardTitle>
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                        {provider.name}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <CardDescription className="mt-3 text-sm line-clamp-2">
                            {model.description}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-grow space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                                <span>Performance</span>
                                <span>{metrics.label}</span>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-amber-500"/>
                                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                        <motion.div
                                            initial={{width: 0}}
                                            animate={{width: `${metrics.speed}%`}}
                                            transition={{duration: 0.5, delay: 0.1}}
                                            className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500">{metrics.speed}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Gem className="w-3 h-3 text-blue-500"/>
                                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                        <motion.div
                                            initial={{width: 0}}
                                            animate={{width: `${metrics.quality}%`}}
                                            transition={{duration: 0.5, delay: 0.2}}
                                            className="h-full bg-gradient-to-r from-blue-400 to-blue-500"
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500">{metrics.quality}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-3 h-3 text-green-500"/>
                                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                        <motion.div
                                            initial={{width: 0}}
                                            animate={{width: `${metrics.cost}%`}}
                                            transition={{duration: 0.5, delay: 0.3}}
                                            className="h-full bg-gradient-to-r from-green-400 to-green-500"
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500">{metrics.cost}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {model.contextWindow && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Cpu className="w-4 h-4"/>
                                    <span className="font-medium">Context:</span>
                                    <span>{model.contextWindow}</span>
                                </div>
                            )}
                            {model.pricing && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <DollarSign className="w-4 h-4"/>
                                    <span className="font-medium">Pricing:</span>
                                    <span className="text-xs">{model.pricing}</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-600">Capabilities</p>
                            <div className="flex flex-wrap gap-1.5">
                                {model.capabilities.map(cap => {
                                    const capConfig = capabilityIcons[cap] || {icon: Sparkles, color: 'text-gray-500'};
                                    const CapIcon = capConfig.icon;
                                    return (
                                        <TooltipProvider key={cap}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs px-2 py-0.5 flex items-center gap-1"
                                                    >
                                                        <CapIcon className={cn("w-3 h-3", capConfig.color)}/>
                                                        <span className="capitalize">{cap.replace('-', ' ')}</span>
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="capitalize">{cap.replace('-', ' ')}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="border-t bg-gray-50/50 py-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs hover:bg-white/80"
                            onClick={() => setSelectedModel({model, providerId: provider.id})}
                        >
                            <Eye className="w-3.5 h-3.5 mr-1.5"/>
                            View Details
                            <ChevronRight className="w-3.5 h-3.5 ml-auto"/>
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        );
    };

    const ListView = ({model, provider}: { model: Model; provider: ModelProvider }) => {
        const config = providerConfig[provider.id] || {
            color: 'text-gray-600',
            icon: Bot,
            gradient: 'from-gray-400 to-gray-500'
        };
        const Icon = config.icon;
        const metrics = model.performance

        return (
            <motion.div
                layout
                initial={{opacity: 0, x: -20}}
                animate={{opacity: 1, x: 0}}
                exit={{opacity: 0, x: 20}}
                className="group"
            >
                <div className="p-4 bg-white rounded-lg border hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-2 rounded-lg bg-gradient-to-br text-white shadow-sm",
                            config.gradient
                        )}>
                            <Icon className="w-4 h-4"/>
                        </div>

                        <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-3">
                                <div className="font-medium">{model.name}</div>
                                <Badge variant="secondary" className="text-xs mt-1">
                                    {provider.name}
                                </Badge>
                            </div>

                            <div className="col-span-4 text-sm text-gray-600">
                                {model.description}
                            </div>

                            <div className="col-span-2 flex items-center gap-2">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1">
                                        <Zap className="w-3 h-3 text-amber-500"/>
                                        <div className="w-16 bg-gray-200 rounded-full h-1 overflow-hidden">
                                            <div
                                                className="h-full bg-amber-500"
                                                style={{width: `${metrics.speed}%`}}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Gem className="w-3 h-3 text-blue-500"/>
                                        <div className="w-16 bg-gray-200 rounded-full h-1 overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500"
                                                style={{width: `${metrics.quality}%`}}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-2 text-sm">
                                {model.contextWindow && (
                                    <div className="flex items-center gap-1 text-gray-600">
                                        <Cpu className="w-3 h-3"/>
                                        <span>{model.contextWindow}</span>
                                    </div>
                                )}
                            </div>

                            <div className="col-span-1 flex justify-end gap-1">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleCopyModelId(model.id)}
                                            >
                                                <Copy className="w-3.5 h-3.5"/>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Copy model ID</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setSelectedModel({model, providerId: provider.id})}
                                >
                                    <Eye className="w-3.5 h-3.5"/>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    if (isLoading)
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
                <motion.div
                    animate={{rotate: 360}}
                    transition={{duration: 1, repeat: Infinity, ease: "linear"}}
                >
                    <Loader2 className="h-12 w-12 text-blue-600"/>
                </motion.div>
                <p className="text-gray-600 font-medium">Loading AI models...</p>
            </div>
        );


    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <motion.header
                    initial={{opacity: 0, y: -20}}
                    animate={{opacity: 1, y: 0}}
                    className="text-center space-y-4"
                >
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        AI Model Explorer
                    </h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Discover and compare cutting-edge AI models from leading providers.
                        Find the perfect model for your use case.
                    </p>
                </motion.header>
                <motion.div
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{delay: 0.1}}
                    className="bg-white rounded-xl shadow-sm border p-6 space-y-4"
                >
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                            <Input
                                placeholder="Search models by name or description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Select value={providerFilter} onValueChange={setProviderFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Provider"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Providers</SelectItem>
                                    {modelProviders.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={capabilityFilter} onValueChange={setCapabilityFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Capability"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Capabilities</SelectItem>
                                    {allCapabilities.map(cap => (
                                        <SelectItem key={cap} value={cap}>
                                            {cap.replace('-', ' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Status"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="available">Available</SelectItem>
                                    <SelectItem value="beta">Beta</SelectItem>
                                    <SelectItem value="deprecated">Deprecated</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                                <SelectTrigger className="w-[140px]">
                                    <ArrowUpDown className="w-4 h-4 mr-2"/>
                                    <SelectValue placeholder="Sort by"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">Name</SelectItem>
                                    <SelectItem value="provider">Provider</SelectItem>
                                    <SelectItem value="performance">Performance</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                <Button
                                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('grid')}
                                    className="h-8 px-3"
                                >
                                    <Grid3x3 className="w-4 h-4"/>
                                </Button>
                                <Button
                                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setViewMode('list')}
                                    className="h-8 px-3"
                                >
                                    <List className="w-4 h-4"/>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <p>
                            Found <span className="font-semibold text-gray-900">
                                {filteredAndSortedProviders.reduce((acc, p) => acc + p.models.length, 0)}
                            </span> models
                            {searchTerm && ` matching "${searchTerm}"`}
                        </p>
                    </div>
                </motion.div>

                <AnimatePresence mode="wait">
                    {filteredAndSortedProviders.length > 0 ? (
                        <motion.div
                            key="models"
                            initial={{opacity: 0}}
                            animate={{opacity: 1}}
                            exit={{opacity: 0}}
                            className="space-y-8"
                        >
                            {filteredAndSortedProviders.map((provider, providerIndex) => {
                                const ProviderIcon = providerConfig[provider.id]?.icon ?? Bot
                                return (
                                    <motion.section
                                        key={provider.id}
                                        initial={{opacity: 0, y: 20}}
                                        animate={{opacity: 1, y: 0}}
                                        transition={{delay: providerIndex * 0.1}}
                                    >
                                        <div className="mb-4 flex items-center gap-3">
                                            <div
                                                className={cn(
                                                    "p-2 rounded-lg bg-gradient-to-br text-white shadow",
                                                    providerConfig[provider.id]?.gradient || "from-gray-400 to-gray-500"
                                                )}
                                            >
                                                <ProviderIcon className="w-5 h-5"/>
                                            </div>
                                            <h2 className="text-2xl font-semibold text-gray-800">
                                                {provider.name}
                                            </h2>
                                            <Badge variant="secondary" className="ml-2">
                                                {provider.models.length} model{provider.models.length !== 1 && "s"}
                                            </Badge>
                                        </div>

                                        {viewMode === "grid" ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {provider.models.map(model => (
                                                    <ModelCard key={model.id} model={model} provider={provider}/>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {provider.models.map(model => (
                                                    <ListView key={model.id} model={model} provider={provider}/>
                                                ))}
                                            </div>
                                        )}
                                    </motion.section>
                                )
                            })}

                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{opacity: 0, scale: 0.95}}
                            animate={{opacity: 1, scale: 1}}
                            exit={{opacity: 0, scale: 0.95}}
                            className="text-center py-20"
                        >
                            <div className="bg-white rounded-2xl shadow-sm border p-12 max-w-md mx-auto">
                                <Search className="mx-auto h-12 w-12 text-gray-400 mb-4"/>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No models found</h3>
                                <p className="text-gray-600">
                                    Try adjusting your search or filters to find what you're looking for.
                                </p>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setProviderFilter('all');
                                        setCapabilityFilter('all');
                                        setStatusFilter('all');
                                    }}
                                    className="mt-4"
                                >
                                    Clear all filters
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <Dialog open={!!selectedModel} onOpenChange={() => setSelectedModel(null)}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        {selectedModel && (
                            <>
                                <DialogHeader>
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "p-3 rounded-lg bg-gradient-to-br text-white shadow-md",
                                            providerConfig[selectedModel.providerId]?.gradient || 'from-gray-400 to-gray-500'
                                        )}>
                                            {(() => {
                                                const IconComponent = providerConfig[selectedModel.providerId]?.icon || Bot;
                                                return <IconComponent className="w-6 h-6"/>;
                                            })()}
                                        </div>
                                        <div className="flex-1">
                                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                                {selectedModel.model.name}
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleCopyModelId(selectedModel.model.id)}
                                                            >
                                                                <Copy className="w-4 h-4"/>
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Copy model ID</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </DialogTitle>
                                            <DialogDescription className="text-base mt-1">
                                                {selectedModel.model.description}
                                            </DialogDescription>
                                        </div>
                                    </div>
                                </DialogHeader>

                                <div className="mt-6 space-y-6">
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h3 className="font-semibold text-gray-900 mb-3">Performance Overview</h3>
                                        {(() => {
                                            const metrics = selectedModel.model.performance;
                                            return (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Zap className="w-4 h-4 text-amber-500"/>
                                                            <span className="text-sm font-medium">Speed</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-1 max-w-xs ml-4">
                                                            <div
                                                                className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                                                                    style={{width: `${metrics.speed}%`}}
                                                                />
                                                            </div>
                                                            <span
                                                                className="text-sm font-medium w-12 text-right">{metrics.speed}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Gem className="w-4 h-4 text-blue-500"/>
                                                            <span className="text-sm font-medium">Quality</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-1 max-w-xs ml-4">
                                                            <div
                                                                className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500"
                                                                    style={{width: `${metrics.quality}%`}}
                                                                />
                                                            </div>
                                                            <span
                                                                className="text-sm font-medium w-12 text-right">{metrics.quality}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <DollarSign className="w-4 h-4 text-green-500"/>
                                                            <span className="text-sm font-medium">Cost Efficiency</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-1 max-w-xs ml-4">
                                                            <div
                                                                className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
                                                                    style={{width: `${metrics.cost}%`}}
                                                                />
                                                            </div>
                                                            <span
                                                                className="text-sm font-medium w-12 text-right">{metrics.cost}%</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-2 text-center">
                                                        <Badge variant="secondary">{metrics.label}</Badge>
                                                    </p>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-3">Technical Specifications</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {selectedModel.model.contextWindow && (
                                                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                                    <Cpu className="w-5 h-5 text-gray-600"/>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Context Window</p>
                                                        <p className="font-medium">{selectedModel.model.contextWindow}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {selectedModel.model.pricing && (
                                                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                                    <DollarSign className="w-5 h-5 text-gray-600"/>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Pricing</p>
                                                        <p className="font-medium text-sm">{selectedModel.model.pricing}</p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                                <Shield className="w-5 h-5 text-gray-600"/>
                                                <div>
                                                    <p className="text-xs text-gray-500">Status</p>
                                                    <p className="font-medium capitalize">{selectedModel.model.status}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                                <Code2 className="w-5 h-5 text-gray-600"/>
                                                <div>
                                                    <p className="text-xs text-gray-500">Model ID</p>
                                                    <p className="font-mono text-sm">{selectedModel.model.id}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-3">Capabilities</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedModel.model.capabilities.map(cap => {
                                                const capConfig = capabilityIcons[cap] || {
                                                    icon: Sparkles,
                                                    color: 'text-gray-500'
                                                };
                                                const CapIcon = capConfig.icon;
                                                return (
                                                    <div
                                                        key={cap}
                                                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
                                                    >
                                                        <CapIcon className={cn("w-4 h-4", capConfig.color)}/>
                                                        <span className="text-sm font-medium capitalize">
                                                            {cap.replace('-', ' ')}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-3">Quick Start</h3>
                                        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-gray-400">Example Request</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-gray-400 hover:text-gray-200"
                                                    onClick={() => {
                                                        const code = `curl -X POST https://api.uniai.com/v1/chat/completions \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "${selectedModel.model.id}",\n    "messages": [{"role": "user", "content": "Hello!"}]\n  }'`;
                                                        navigator.clipboard.writeText(code);
                                                        toast.success('Code copied to clipboard');
                                                    }}
                                                >
                                                    <Copy className="w-3 h-3 mr-1"/>
                                                    Copy
                                                </Button>
                                            </div>
                                            <pre className="whitespace-pre-wrap text-xs">
{`curl -X POST https://api.uniai.com/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${selectedModel.model.id}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
                                            </pre>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                window.open(`https://docs.uniai.com/models/${selectedModel.model.id}`, '_blank');
                                            }}
                                        >
                                            <BookOpen className="w-4 h-4 mr-2"/>
                                            View Documentation
                                        </Button>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    window.location.href = `/playground?model=${selectedModel.model.id}`;
                                                }}
                                            >
                                                <FlaskConical className="w-4 h-4 mr-2"/>
                                                Try in Playground
                                            </Button>
                                            <Button
                                                onClick={() => setSelectedModel(null)}
                                            >
                                                Close
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{delay: 0.5}}
                className="fixed bottom-8 right-8 bg-white rounded-lg shadow-lg border p-4 hidden lg:block"
            >
                <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
                        <span className="text-gray-600">
                            <span className="font-semibold text-gray-900">
                                {modelProviders.reduce((acc, p) => acc + p.models.filter(m => m.status === 'available').length, 0)}
                            </span> Available
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"/>
                        <span className="text-gray-600">
                            <span className="font-semibold text-gray-900">
                                {modelProviders.reduce((acc, p) => acc + p.models.filter(m => m.status === 'beta').length, 0)}
                            </span> Beta
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"/>
                        <span className="text-gray-600">
                            <span className="font-semibold text-gray-900">
                                {modelProviders.length}
                            </span> Providers
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}