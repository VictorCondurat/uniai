'use client';

import {useState, useEffect, useCallback, useRef} from 'react';
import axios from 'axios';
import clsx from 'clsx'

const cn = clsx
import {
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';
import {
    Cpu, Zap, DollarSign as DollarSignIcon, Layers, Settings, PlusCircle,
    Trash2, Info, Loader2, ArrowUpDown, ChevronDown, Search, Filter,
    BrainCircuit,
    Sparkles,
    BookOpen,
} from 'lucide-react';
import {DndProvider, useDrag, useDrop} from 'react-dnd';
import {HTML5Backend} from 'react-dnd-html5-backend';
import {Switch} from '@/components/ui/switch';

interface ModelProvider {
    id: string;
    name: string;
    icon?: React.ElementType;
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
    status: 'available' | 'beta' | 'deprecated';
}

interface ModelChainStep {
    id: string;
    modelId: string;
    modelName?: string;
    provider?: string;
}

interface ModelChain {
    id: string;
    name: string;
    description?: string;
    projectId?: string;
    steps: ModelChainStep[];
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

const ItemTypes = {MODEL: 'model', CHAIN_STEP: 'chainStep'};

interface DraggableChainStepProps {
    step: ModelChainStep;
    index: number;
    moveStep: (dragIndex: number, hoverIndex: number) => void;
    onRemove: (stepId: string) => void;
    allModels: Model[]; // Pass all available models for the select dropdown
}

const DraggableChainStep: React.FC<DraggableChainStepProps> = ({step, index, moveStep, onRemove, allModels}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [{handlerId}, drop] = useDrop({
        accept: ItemTypes.CHAIN_STEP,
        collect(monitor) {
            return {handlerId: monitor.getHandlerId()};
        },
        hover(item: any, monitor) {
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;
            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
            moveStep(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });
    const [{isDragging}, drag] = useDrag({
        type: ItemTypes.CHAIN_STEP,
        item: () => ({id: step.id, index}),
        collect: (monitor) => ({isDragging: monitor.isDragging()}),
    });
    drag(drop(ref));

    const selectedModel = allModels.find(m => m.id === step.modelId);

    return (
        <div
            ref={ref}
            data-handler-id={handlerId}
            style={{opacity: isDragging ? 0.5 : 1}}
            className="p-3 mb-2 border bg-white rounded-md shadow-sm flex items-center justify-between cursor-grab hover:shadow-md"
        >
            <div className="flex items-center">
                <ArrowUpDown className="w-4 h-4 text-gray-400 mr-3 shrink-0"/>
                <span className="font-medium text-gray-700">{index + 1}. {selectedModel?.name || step.modelId}</span>
                {selectedModel && <Badge variant="outline" className="ml-2 text-xs">{selectedModel.provider}</Badge>}
            </div>
            <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 h-7 w-7"
                    onClick={() => onRemove(step.id)}>
                <Trash2 className="w-4 h-4"/>
            </Button>
        </div>
    );
};


export default function ModelsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modelProviders, setModelProviders] = useState<ModelProvider[]>([]);
    const [allModelsList, setAllModelsList] = useState<Model[]>([]); // Flat list of all models for dropdowns

    const [modelChains, setModelChains] = useState<ModelChain[]>([]);
    const [isChainDialogOpen, setIsChainDialogOpen] = useState(false);
    const [currentChain, setCurrentChain] = useState<Partial<ModelChain> & { steps: ModelChainStep[] }>({
        id: undefined, name: '', description: '', steps: [], active: true,
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [providerFilter, setProviderFilter] = useState('all');

    const fetchModelsAndChains = useCallback(async () => {
        setIsLoading(true);
        try {
            const [modelsRes, chainsRes] = await Promise.all([
                axios.get<ModelProvider[]>('/api/models'), // Endpoint to get grouped models
                axios.get<ModelChain[]>('/api/models/chains'), // Endpoint to get user's chains
            ]);

            setModelProviders(modelsRes.data);
            const flatModels = modelsRes.data.reduce((acc, provider) => acc.concat(provider.models), [] as Model[]);
            setAllModelsList(flatModels);
            setModelChains(chainsRes.data);

        } catch (error) {
            console.error('Failed to fetch models or chains:', error);
            toast.error('Could not load model data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchModelsAndChains();
    }, [fetchModelsAndChains]);

    const openChainDialog = (chain?: ModelChain) => {
        if (chain) {
            setCurrentChain({
                id: chain.id,
                name: chain.name,
                description: chain.description,
                steps: chain.steps.map(s => ({
                    ...s,
                    modelName: allModelsList.find(m => m.id === s.modelId)?.name,
                    provider: allModelsList.find(m => m.id === s.modelId)?.provider
                })), // enrich with name/provider
                active: chain.active,
            });
        } else {
            setCurrentChain({id: undefined, name: '', description: '', steps: [], active: true});
        }
        setIsChainDialogOpen(true);
    };

    const handleChainStepChange = (field: keyof ModelChainStep, value: any, stepId: string) => {
        setCurrentChain(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === stepId ? {...s, [field]: value} : s),
        }));
    };

    const addStepToChain = () => {
        if (allModelsList.length === 0) {
            toast.info("Please add models first to create a chain.");
            return;
        }
        const defaultModel = allModelsList[0]; // Default to the first available model
        setCurrentChain(prev => ({
            ...prev,
            steps: [...prev.steps, {
                id: `new_${Date.now()}`,
                modelId: defaultModel.id,
                modelName: defaultModel.name,
                provider: defaultModel.provider
            }],
        }));
    };

    const removeStepFromChain = (stepId: string) => {
        setCurrentChain(prev => ({...prev, steps: prev.steps.filter(s => s.id !== stepId)}));
    };

    const moveChainStep = useCallback((dragIndex: number, hoverIndex: number) => {
        setCurrentChain(prev => {
            const newSteps = [...prev.steps];
            const [draggedItem] = newSteps.splice(dragIndex, 1);
            newSteps.splice(hoverIndex, 0, draggedItem);
            return {...prev, steps: newSteps};
        });
    }, []);


    const handleSaveChain = async () => {
        if (!(currentChain.name ?? '').trim()) {
            toast.error('Please provide a name for the model chain.')
            return
        }
        if (currentChain.steps.length === 0) {
            toast.error(`A chain must have at least one model step.`);
            return;
        }

        setIsSubmitting(true);
        const payload = {
            name: currentChain.name,
            description: currentChain.description,
            steps: currentChain.steps.map(s => ({modelId: s.modelId})),
            active: currentChain.active,
            projectId: currentChain.projectId,
        };

        try {
            if (currentChain.id && !currentChain.id.startsWith('new_')) {
                await axios.put(`/api/models/chains/${currentChain.id}`, payload);
            } else {
                await axios.post('/api/models/chains', payload);
            }
            toast.success(`Model chain ${currentChain.id ? 'updated' : 'created'} successfully.`);
            setIsChainDialogOpen(false);
            await fetchModelsAndChains();
        } catch (error: any) {
            toast.error(`Failed to save model chain: ${error.response?.data?.error || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteChain = async (chainId: string) => {
        if (!confirm("Are you sure you want to delete this model chain? This action cannot be undone.")) return;
        setIsSubmitting(true);
        try {
            await axios.delete(`/api/models/chains/${chainId}`);
            toast.success("Model chain deleted successfully.");
            await fetchModelsAndChains();
        } catch (error: any) {
            toast.error("Failed to delete model chain.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredModelProviders = modelProviders
        .map(provider => ({
            ...provider,
            models: provider.models.filter(model =>
                model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                model.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                model.capabilities.some(cap => cap.toLowerCase().includes(searchTerm.toLowerCase()))
            ),
        }))
        .filter(provider =>
            (providerFilter === 'all' || provider.id === providerFilter) && provider.models.length > 0
        );


    if (isLoading) {
        return <div className="flex justify-center items-center min-h-[calc(100vh-120px)] bg-gray-50"><Loader2
            className="h-12 w-12 animate-spin text-blue-600"/></div>;
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10 bg-gray-50 min-h-screen">
                <header className="pb-6 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-800">Explore
                                Models</h1>
                            <p className="mt-2 text-md md:text-lg text-gray-500">Discover and configure AI models and
                                create powerful fallback chains.</p>
                        </div>
                        <Button size="lg" onClick={() => openChainDialog()}
                                className="bg-blue-600 hover:bg-blue-700 text-white">
                            <PlusCircle className="mr-2 h-5 w-5"/> Create Model Chain
                        </Button>
                    </div>
                </header>

                <section>
                    <h2 className="text-2xl font-semibold text-gray-700 mb-2 flex items-center">
                        <Layers className="mr-3 h-7 w-7 text-blue-600"/> My Model Chains
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">Organize sequences of models for robust and intelligent
                        request handling.</p>
                    {modelChains.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {modelChains.map(chain => (
                                <Card key={chain.id} className="shadow-md hover:shadow-lg transition-shadow bg-white">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <CardTitle
                                                className="text-lg font-semibold text-gray-800">{chain.name}</CardTitle>
                                            <Badge
                                                variant={chain.active ? 'success' : 'secondary'}
                                                className={chain.active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-600'}
                                            >
                                                {chain.active ? 'Active' : 'Inactive'}
                                            </Badge>

                                        </div>
                                        <CardDescription
                                            className="text-xs text-gray-500 line-clamp-2">{chain.description || "No description."}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="text-sm">
                                        <p className="text-gray-600 font-medium mb-1">Steps: {chain.steps.length}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {chain.steps.slice(0, 3).map((step, idx) => (
                                                <Badge key={step.id} variant="outline" className="text-xs">
                                                    {allModelsList.find(m => m.id === step.modelId)?.name || step.modelId}
                                                </Badge>
                                            ))}
                                            {chain.steps.length > 3 &&
                                                <Badge variant="outline" className="text-xs">...</Badge>}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="border-t pt-3 pb-3 px-4 flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" className="text-xs"
                                                onClick={() => openChainDialog(chain)}><Settings
                                            className="w-3.5 h-3.5 mr-1.5"/>Configure</Button>
                                        <Button variant="ghost" size="sm"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs"
                                                onClick={() => handleDeleteChain(chain.id)}><Trash2
                                            className="w-3.5 h-3.5 mr-1.5"/>Delete</Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg bg-white">
                            <Layers className="mx-auto h-12 w-12 text-gray-400"/>
                            <h3 className="mt-2 text-lg font-medium text-gray-700">No Model Chains Created</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by creating your first model
                                chain.</p>
                        </div>
                    )}
                </section>


                <section>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-700 flex items-center">
                                <BrainCircuit className="mr-3 h-7 w-7 text-blue-600"/> Available Models
                            </h2>
                            <p className="text-sm text-gray-500">Browse models from various providers.</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-grow md:flex-grow-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                                <Input placeholder="Search models..." value={searchTerm}
                                       onChange={e => setSearchTerm(e.target.value)} className="pl-10 w-full md:w-64"/>
                            </div>
                            <Select value={providerFilter} onValueChange={setProviderFilter}>
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <Filter className="h-4 w-4 mr-2 text-gray-500"/>
                                    <SelectValue placeholder="Filter provider"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Providers</SelectItem>
                                    {modelProviders.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {filteredModelProviders.length > 0 ? filteredModelProviders.map(provider => (
                        <div key={provider.id} className="mb-10">
                            <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
                                {provider.name} Models
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {provider.models.map(model => (
                                    <Card key={model.id}
                                          className="shadow-md hover:shadow-lg transition-shadow bg-white flex flex-col">
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <CardTitle
                                                    className="text-lg font-semibold text-gray-800">{model.name}</CardTitle>
                                                <Badge
                                                    variant={
                                                        model.status === 'available'
                                                            ? 'success'    // ✅ green
                                                            : model.status === 'beta'
                                                                ? 'warning'    // ✅ yellow
                                                                : 'destructive'// deprecated → red
                                                    }
                                                    className={cn(
                                                        model.status === 'available'  && 'bg-green-100 text-green-700',
                                                        model.status === 'beta'       && 'bg-yellow-100 text-yellow-700',
                                                        model.status === 'deprecated' && 'bg-red-100 text-red-700',
                                                        'text-xs'
                                                    )}
                                                >
                                                    {model.status[0].toUpperCase() + model.status.slice(1)}
                                                </Badge>

                                            </div>
                                            <CardDescription
                                                className="text-xs text-gray-500 line-clamp-2 h-8">{model.description}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="text-sm space-y-2 flex-grow">
                                            <div className="flex items-center text-gray-600"><Cpu
                                                className="w-4 h-4 mr-2 text-blue-500"/> Context: {model.contextWindow || 'N/A'}
                                            </div>
                                            {model.pricing &&
                                                <div className="flex items-center text-gray-600"><DollarSignIcon
                                                    className="w-4 h-4 mr-2 text-green-500"/> Pricing: {model.pricing}
                                                </div>}
                                            <div>
                                                <p className="text-xs font-medium text-gray-500 mb-1">Capabilities:</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {model.capabilities.map(cap => <Badge key={cap} variant="outline"
                                                                                          className="text-xs">{cap}</Badge>)}
                                                </div>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="border-t pt-3 pb-3 px-4">
                                            <Button variant="link" size="sm"
                                                    className="text-blue-600 p-0 h-auto text-xs"
                                                    onClick={() => alert(`Details for ${model.name} (to be implemented)`)}>
                                                <BookOpen className="w-3.5 h-3.5 mr-1"/> View Details & Docs
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )) : (
                        <div
                            className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg bg-white mt-6">
                            <Search className="mx-auto h-12 w-12 text-gray-400"/>
                            <h3 className="mt-2 text-lg font-medium text-gray-700">No Models Found</h3>
                            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter criteria.</p>
                        </div>
                    )}
                </section>

                <Dialog open={isChainDialogOpen} onOpenChange={setIsChainDialogOpen}>
                    <DialogContent className="sm:max-w-2xl p-0">
                        <DialogHeader className="p-6 pb-4 border-b">
                            <DialogTitle
                                className="text-xl font-semibold">{currentChain.id ? 'Edit' : 'Create New'} Model
                                Chain</DialogTitle>
                            <DialogDescription>Define a sequence of models for robust request processing and
                                fallbacks.</DialogDescription>
                        </DialogHeader>
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="space-y-1.5">
                                <Label htmlFor="chainName">Chain Name</Label>
                                <Input id="chainName" placeholder="e.g., Smart Content Generation Chain"
                                       value={currentChain.name}
                                       onChange={e => setCurrentChain(p => ({...p, name: e.target.value}))}/>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="chainDescription">Description (Optional)</Label>
                                <Textarea id="chainDescription" placeholder="Describe what this chain is for..."
                                          value={currentChain.description || ''}
                                          onChange={e => setCurrentChain(p => ({...p, description: e.target.value}))}
                                          rows={2}/>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="chainActive" checked={currentChain.active}
                                        onCheckedChange={checked => setCurrentChain(p => ({...p, active: checked}))}/>
                                <Label htmlFor="chainActive" className="text-sm font-medium">Active Chain</Label>
                            </div>

                            <div>
                                <Label className="text-md font-medium text-gray-700 mb-2 block">Chain Steps (Drag to
                                    reorder)</Label>
                                {currentChain.steps.length > 0 ? (
                                    currentChain.steps.map((step, index) => (
                                        <DraggableChainStep
                                            key={step.id}
                                            index={index}
                                            step={step}
                                            moveStep={moveChainStep}
                                            onRemove={removeStepFromChain}
                                            allModels={allModelsList}
                                        />
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 py-4 text-center border border-dashed rounded-md">No
                                        steps added yet. Click &#34;Add Step&#34; to begin.</p>
                                )}
                                <Button variant="outline" size="sm" onClick={addStepToChain} className="mt-3 w-full">
                                    <PlusCircle className="w-4 h-4 mr-2"/> Add Step
                                </Button>
                            </div>
                        </div>
                        <DialogFooter className="p-6 pt-4 border-t flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsChainDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveChain} disabled={isSubmitting}
                                    className="bg-blue-600 hover:bg-blue-700">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                {currentChain.id ? 'Save Changes' : 'Create Chain'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </DndProvider>
    );
}