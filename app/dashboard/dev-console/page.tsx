"use client"
import { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import MonacoEditor from '@monaco-editor/react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Terminal, KeyRound, Cpu, TestTube2, MessageSquare, Loader2, Send, 
  Play, Pause, Square, Plus, Trash2, Zap, Clock,
  CheckCircle, XCircle, AlertCircle, BarChart3, Activity,
  Minimize2, Maximize2
} from 'lucide-react';
import { ALL_MODELS_CONFIG } from '@/lib/modelsConfig';

const simulationBoxSchema = z.object({
  apiKey: z.string().min(1, 'API Key is required.'),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters.'),
  useRandomPrompt: z.boolean(),
  model: z.string().min(1, 'Please select a model.'),
  requestCount: z.number().min(1).max(10000),
  requestInterval: z.number().min(0).max(30000),
  enableBurst: z.boolean(),
  burstSize: z.number().min(1).max(100),
  burstInterval: z.number().min(100).max(60000),
});

type SimulationBoxInputs = z.infer<typeof simulationBoxSchema>;

interface RequestLog {
  id: string;
  timestamp: string;
  status: 'pending' | 'success' | 'error' | 'timeout';
  duration?: number;
  statusCode?: number;
  error?: string;
  tokens?: number;
  model: string;
  prompt: string;
}

interface SimulationBox {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  progress: number;
  logs: RequestLog[];
  config: SimulationBoxInputs;
  stats: {
    totalRequests: number;
    successCount: number;
    errorCount: number;
    avgLatency: number;
    totalTokens: number;
    startTime?: Date;
    endTime?: Date;
  };
  isMinimized: boolean;
}

const randomPrompts = [
  "Write a creative story about space exploration.",
  "Explain quantum computing in simple terms.",
  "Generate a poem about artificial intelligence.",
  "Describe the future of renewable energy.",
  "Create a short dialogue between two robots.",
  "Write about the benefits of meditation.",
  "Explain how machine learning works.",
  "Describe a futuristic city.",
  "Write a haiku about technology.",
  "Explain the concept of time travel.",
];

export default function MultiSimulatorPage() {
  const [simulationBoxes, setSimulationBoxes] = useState<SimulationBox[]>([]);
  const [simulationControllers, setSimulationControllers] = useState<Map<string, AbortController>>(new Map());
  const [globalStats, setGlobalStats] = useState({
    totalBoxes: 0,
    runningBoxes: 0,
    totalRequests: 0,
    totalSuccessful: 0,
    totalErrors: 0,
  });

  const createNewBox = () => {
    const newBox: SimulationBox = {
      id: `box-${Date.now()}`,
      name: `Simulation ${simulationBoxes.length + 1}`,
      status: 'idle',
      progress: 0,
      logs: [],
      config: {
        apiKey: '',
        prompt: 'Write a short story about artificial intelligence.',
        useRandomPrompt: false,
        model: 'gpt-4o',
        requestCount: 10,
        requestInterval: 1000,
        enableBurst: false,
        burstSize: 5,
        burstInterval: 5000,
      },
      stats: {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        avgLatency: 0,
        totalTokens: 0,
      },
      isMinimized: false,
    };
    
    setSimulationBoxes(prev => [...prev, newBox]);
  };

  const removeBox = (boxId: string) => {
    const controller = simulationControllers.get(boxId);
    if (controller) {
      controller.abort();
    }
    
    setSimulationBoxes(prev => prev.filter(box => box.id !== boxId));
    setSimulationControllers(prev => {
      const newMap = new Map(prev);
      newMap.delete(boxId);
      return newMap;
    });
  };

  const toggleMinimize = (boxId: string) => {
    setSimulationBoxes(prev => prev.map(box => 
      box.id === boxId ? { ...box, isMinimized: !box.isMinimized } : box
    ));
  };

  const updateBoxConfig = (boxId: string, config: Partial<SimulationBoxInputs>) => {
    setSimulationBoxes(prev => prev.map(box => 
      box.id === boxId ? { ...box, config: { ...box.config, ...config } } : box
    ));
  };

  const pauseSimulation = (boxId: string) => {
    setSimulationBoxes(prev => prev.map(box => 
      box.id === boxId ? { ...box, status: 'paused' } : box
    ));
    toast.info('Simulation paused');
  };

  const resumeSimulation = (boxId: string) => {
    setSimulationBoxes(prev => prev.map(box => 
      box.id === boxId ? { ...box, status: 'running' } : box
    ));
    toast.info('Simulation resumed');
  };

  const stopSimulation = (boxId: string) => {
    const controller = simulationControllers.get(boxId);
    if (controller) {
      controller.abort();
    }
    
    setSimulationBoxes(prev => prev.map(box => 
      box.id === boxId ? { 
        ...box, 
        status: 'completed',
        stats: { ...box.stats, endTime: new Date() }
      } : box
    ));
    
    toast.info('Simulation stopped');
  };

  const startSimulation = async (boxId: string) => {
    const box = simulationBoxes.find(b => b.id === boxId);
    if (!box || box.status === 'running') return;

    const controller = new AbortController();
    setSimulationControllers(prev => new Map(prev.set(boxId, controller)));

    setSimulationBoxes(prev => prev.map(b =>
      b.id === boxId ? { 
        ...b, 
        status: 'running', 
        progress: 0, 
        logs: [], 
        stats: { ...b.stats, startTime: new Date() }
      } : b
    ));

    const completionsUrl = '/api/v1/chat/completions';
    const { config } = box;
    
    try {
      let requestIndex = 0;
      const totalRequests = config.requestCount;
      
      const makeRequest = async (index: number): Promise<void> => {
        if (controller.signal.aborted) return;
        
        const getCurrentBox = () => simulationBoxes.find(b => b.id === boxId);
        while (getCurrentBox()?.status === 'paused' && !controller.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (controller.signal.aborted) return;

        const requestId = `${boxId}-req-${index + 1}`;
        const startTime = Date.now();
        
        const promptToUse = config.useRandomPrompt
          ? randomPrompts[Math.floor(Math.random() * randomPrompts.length)]
          : config.prompt;

        const pendingLog: RequestLog = {
          id: requestId,
          timestamp: new Date().toISOString(),
          status: 'pending',
          model: config.model,
          prompt: promptToUse.substring(0, 50) + '...',
        };

        setSimulationBoxes(prev => prev.map(b => 
          b.id === boxId ? { 
            ...b, 
            logs: [...b.logs, pendingLog],
            progress: ((index + 1) / totalRequests) * 100
          } : b
        ));

        try {
          const response = await fetch(completionsUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
              model: config.model,
              messages: [{ 
                role: 'user', 
                content: `${promptToUse} (Request #${index + 1})` 
              }],
            }),
            signal: controller.signal,
          });

          const duration = Date.now() - startTime;
          const responseData = response.ok ? await response.json() : null;
          
          const updatedLog: RequestLog = {
            ...pendingLog,
            status: response.ok ? 'success' : 'error',
            duration,
            statusCode: response.status,
            error: response.ok ? undefined : `HTTP ${response.status}`,
            tokens: responseData?.usage?.total_tokens || 0,
          };

          setSimulationBoxes(prev => prev.map(b => 
            b.id === boxId ? { 
              ...b, 
              logs: b.logs.map(log => log.id === requestId ? updatedLog : log),
              stats: {
                ...b.stats,
                totalRequests: b.stats.totalRequests + 1,
                successCount: response.ok ? b.stats.successCount + 1 : b.stats.successCount,
                errorCount: response.ok ? b.stats.errorCount : b.stats.errorCount + 1,
                avgLatency: ((b.stats.avgLatency * b.stats.totalRequests) + duration) / (b.stats.totalRequests + 1),
                totalTokens: b.stats.totalTokens + (responseData?.usage?.total_tokens || 0),
              }
            } : b
          ));

        } catch (error: any) {
          if (error.name === 'AbortError') return;
          
          const duration = Date.now() - startTime;
          const errorLog: RequestLog = {
            ...pendingLog,
            status: 'error',
            duration,
            error: error.message,
          };

          setSimulationBoxes(prev => prev.map(b => 
            b.id === boxId ? { 
              ...b, 
              logs: b.logs.map(log => log.id === requestId ? errorLog : log),
              stats: {
                ...b.stats,
                totalRequests: b.stats.totalRequests + 1,
                errorCount: b.stats.errorCount + 1,
                avgLatency: ((b.stats.avgLatency * b.stats.totalRequests) + duration) / (b.stats.totalRequests + 1),
              }
            } : b
          ));
        }
      };

      if (config.enableBurst) {
        while (requestIndex < totalRequests && !controller.signal.aborted) {
          const getCurrentBox = () => simulationBoxes.find(b => b.id === boxId);
          
          while (getCurrentBox()?.status === 'paused' && !controller.signal.aborted) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          if (controller.signal.aborted) break;
          
          const batchSize = Math.min(config.burstSize, totalRequests - requestIndex);
          const batch = [];
          
          for (let i = 0; i < batchSize; i++) {
            batch.push(makeRequest(requestIndex + i));
          }
          
          await Promise.all(batch);
          requestIndex += batchSize;
          
          if (requestIndex < totalRequests && config.burstInterval > 0) {
            for (let i = 0; i < config.burstInterval; i += 100) {
              if (controller.signal.aborted) break;
              const currentBox = getCurrentBox();
              if (currentBox?.status === 'paused') {
                while (getCurrentBox()?.status === 'paused' && !controller.signal.aborted) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              } else {
                await new Promise(resolve => setTimeout(resolve, Math.min(100, config.burstInterval - i)));
              }
            }
          }
        }
      } else {
        for (let i = 0; i < totalRequests && !controller.signal.aborted; i++) {
          const getCurrentBox = () => simulationBoxes.find(b => b.id === boxId);
          
          while (getCurrentBox()?.status === 'paused' && !controller.signal.aborted) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          if (controller.signal.aborted) break;
          
          await makeRequest(i);
          
          if (i < totalRequests - 1 && config.requestInterval > 0) {
            for (let j = 0; j < config.requestInterval; j += 100) {
              if (controller.signal.aborted) break;
              const currentBox = getCurrentBox();
              if (currentBox?.status === 'paused') {
                while (getCurrentBox()?.status === 'paused' && !controller.signal.aborted) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              } else {
                await new Promise(resolve => setTimeout(resolve, Math.min(100, config.requestInterval - j)));
              }
            }
          }
        }
      }

      if (!controller.signal.aborted) {
        setSimulationBoxes(prev => prev.map(b => 
          b.id === boxId ? { 
            ...b, 
            status: 'completed', 
            progress: 100,
            stats: { ...b.stats, endTime: new Date() }
          } : b
        ));

        toast.success(`Simulation ${box.name} completed!`);
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setSimulationBoxes(prev => prev.map(b => 
          b.id === boxId ? { ...b, status: 'error' } : b
        ));
        toast.error(`Simulation ${box.name} failed: ${error.message}`);
      }
    } finally {
      setSimulationControllers(prev => {
        const newMap = new Map(prev);
        newMap.delete(boxId);
        return newMap;
      });
    }
  };
  useEffect(() => {
    const runningBoxes = simulationBoxes.filter(box => box.status === 'running').length;
    const totalRequests = simulationBoxes.reduce((sum, box) => sum + box.stats.totalRequests, 0);
    const totalSuccessful = simulationBoxes.reduce((sum, box) => sum + box.stats.successCount, 0);
    const totalErrors = simulationBoxes.reduce((sum, box) => sum + box.stats.errorCount, 0);

    setGlobalStats({
      totalBoxes: simulationBoxes.length,
      runningBoxes,
      totalRequests,
      totalSuccessful,
      totalErrors,
    });
  }, [simulationBoxes]);

  return (
      <div className="space-y-8 p-4 md:p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-tr from-green-600 to-blue-700 rounded-xl flex items-center justify-center">
                <TestTube2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Multi-Simulation Console</h1>
                <p className="text-muted-foreground">
                  Run multiple API simulations simultaneously with real-time monitoring
                </p>
              </div>
            </div>
            <Button onClick={createNewBox} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Add Simulation Box
            </Button>
          </div>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Global Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{globalStats.totalBoxes}</div>
                <div className="text-sm text-muted-foreground">Total Boxes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{globalStats.runningBoxes}</div>
                <div className="text-sm text-muted-foreground">Running</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{globalStats.totalRequests}</div>
                <div className="text-sm text-muted-foreground">Total Requests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{globalStats.totalSuccessful}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{globalStats.totalErrors}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {simulationBoxes.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <TestTube2 className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No simulations yet</h3>
                <p className="text-muted-foreground mb-4">Create your first simulation box to get started</p>
                <Button onClick={createNewBox}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Simulation Box
                </Button>
              </CardContent>
            </Card>
        ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
              <AnimatePresence>
                {simulationBoxes.map((box) => (
                    <SimulationBoxComponent
                        key={box.id}
                        box={box}
                        onStart={() => startSimulation(box.id)}
                        onStop={() => stopSimulation(box.id)}
                        onPause={() => pauseSimulation(box.id)}
                        onResume={() => resumeSimulation(box.id)}
                        onRemove={() => removeBox(box.id)}
                        onToggleMinimize={() => toggleMinimize(box.id)}
                        onConfigChange={(config) => updateBoxConfig(box.id, config)}
                    />
                ))}
              </AnimatePresence>
            </div>
        )}
      </div>
  );
}

interface SimulationBoxProps {
  box: SimulationBox;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onRemove: () => void;
  onToggleMinimize: () => void;
  onConfigChange: (config: Partial<SimulationBoxInputs>) => void;
}

function SimulationBoxComponent({
                                  box,
                                  onStart,
                                  onStop,
                                  onPause,
                                  onResume,
                                  onRemove,
                                  onToggleMinimize,
                                  onConfigChange,
                                }: SimulationBoxProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SimulationBoxInputs>({
    resolver: zodResolver(simulationBoxSchema),
    defaultValues: box.config,
  });

  const logsEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    if (scrollAreaRef.current && box.logs.length > 0) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [box.logs]);
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (box.status === 'running' && box.stats.startTime) {
      interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [box.status, box.stats.startTime]);
  const onSubmit: SubmitHandler<SimulationBoxInputs> = (data) => {
    onConfigChange(data);
    onStart();
  };
  const getDuration = () => {
    if (box.stats.startTime && box.stats.endTime) {
      return Math.round((box.stats.endTime.getTime() - box.stats.startTime.getTime()) / 1000);
    } else if (box.stats.startTime) {
      return Math.round((currentTime - box.stats.startTime.getTime()) / 1000);
    }
    return 0;
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getLogStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
      <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
      >
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(box.status)}`} />
                <CardTitle className="text-lg">{box.name}</CardTitle>
                <Badge variant={box.status === 'running' ? 'outline' : 'secondary'}>
                  {box.status}
                </Badge>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleMinimize}
                >
                  {box.isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {box.status === 'running' && (
                <div className="space-y-2">
                  <Progress value={box.progress} className="h-2" />
                  <div className="text-sm text-muted-foreground">
                    Progress: {box.progress.toFixed(1)}% • {box.stats.successCount} success • {box.stats.errorCount} errors • {getDuration()}s
                  </div>
                </div>
            )}
          </CardHeader>

          {!box.isMinimized && (
              <CardContent className="space-y-4">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="apiKey" className="flex items-center space-x-2">
                      <KeyRound className="w-4 h-4" />
                      <span>API Key</span>
                    </Label>
                    <Input
                        {...register('apiKey')}
                        type="password"
                        placeholder="sk-..."
                        onChange={(e) => onConfigChange({ apiKey: e.target.value })}
                    />
                    {errors.apiKey && <p className="text-red-500 text-xs mt-1">{errors.apiKey.message}</p>}
                  </div>

                  <div>
                    <Label htmlFor="model" className="flex items-center space-x-2">
                      <Cpu className="w-4 h-4" />
                      <span>Model</span>
                    </Label>
                    <Select
                        onValueChange={(value) => {
                          setValue('model', value);
                          onConfigChange({ model: value });
                        }}
                        defaultValue={box.config.model}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_MODELS_CONFIG.map((model) => (
                            <SelectItem key={model.modelIdentifier} value={model.modelIdentifier}>
                              {model.name}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model.message}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Prompt</span>
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                            checked={watch('useRandomPrompt')}
                            onCheckedChange={(checked) => {
                              setValue('useRandomPrompt', checked);
                              onConfigChange({ useRandomPrompt: checked });
                            }}
                        />
                        <Label className="text-sm">Random</Label>
                      </div>
                    </div>

                    {!watch('useRandomPrompt') ? (
                        <Textarea
                            {...register('prompt')}
                            rows={3}
                            placeholder="Enter your prompt..."
                            onChange={(e) => onConfigChange({ prompt: e.target.value })}
                        />
                    ) : (
                        <div className="p-3 bg-muted rounded-md">
                          <p className="text-sm text-muted-foreground">
                            🎲 Using random prompts from predefined pool
                          </p>
                        </div>
                    )}
                    {errors.prompt && <p className="text-red-500 text-xs mt-1">{errors.prompt.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="requestCount" className="flex items-center space-x-2">
                        <Send className="w-4 h-4" />
                        <span>Requests</span>
                      </Label>
                      <Input
                          {...register('requestCount', { valueAsNumber: true })}
                          type="number"
                          min="1"
                          max="10000"
                          onChange={(e) => onConfigChange({ requestCount: parseInt(e.target.value) || 1 })}
                      />
                      {errors.requestCount && <p className="text-red-500 text-xs mt-1">{errors.requestCount.message}</p>}
                    </div>

                    <div>
                      <Label htmlFor="requestInterval" className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>Interval (ms)</span>
                      </Label>
                      <Input
                          {...register('requestInterval', { valueAsNumber: true })}
                          type="number"
                          min="0"
                          max="30000"
                          onChange={(e) => onConfigChange({ requestInterval: parseInt(e.target.value) || 0 })}
                      />
                      {errors.requestInterval && <p className="text-red-500 text-xs mt-1">{errors.requestInterval.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center space-x-2">
                        <Zap className="w-4 h-4" />
                        <span>Burst Mode</span>
                      </Label>
                      <Switch
                          checked={watch('enableBurst')}
                          onCheckedChange={(checked) => {
                            setValue('enableBurst', checked);
                            onConfigChange({ enableBurst: checked });
                          }}
                      />
                    </div>

                    {watch('enableBurst') && (
                        <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-primary/20">
                          <div>
                            <Label htmlFor="burstSize" className="text-sm">Burst Size</Label>
                            <Input
                                {...register('burstSize', { valueAsNumber: true })}
                                type="number"
                                min="1"
                                max="100"
                                onChange={(e) => onConfigChange({ burstSize: parseInt(e.target.value) || 1 })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="burstInterval" className="text-sm">Burst Interval (ms)</Label>
                            <Input
                                {...register('burstInterval', { valueAsNumber: true })}
                                type="number"
                                min="100"
                                max="60000"
                                onChange={(e) => onConfigChange({ burstInterval: parseInt(e.target.value) || 1000 })}
                            />
                          </div>
                        </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    {box.status === 'idle' || box.status === 'completed' || box.status === 'error' ? (
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={!box.config.apiKey || !box.config.model}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Simulation
                        </Button>
                    ) : box.status === 'running' ? (
                        <>
                          <Button
                              type="button"
                              variant="outline"
                              className="flex-1"
                              onClick={onPause}
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </Button>
                          <Button
                              type="button"
                              variant="destructive"
                              onClick={onStop}
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                        </>
                    ) : box.status === 'paused' ? (
                        <>
                          <Button
                              type="button"
                              variant="outline"
                              className="flex-1"
                              onClick={onResume}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </Button>
                          <Button
                              type="button"
                              variant="destructive"
                              onClick={onStop}
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                        </>
                    ) : null}
                  </div>
                </form>

                {box.stats.totalRequests > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Activity className="w-4 h-4 mr-2" />
                        Statistics
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Success Rate:</span>
                          <div className="font-semibold text-green-600">
                            {box.stats.totalRequests > 0
                                ? `${((box.stats.successCount / box.stats.totalRequests) * 100).toFixed(1)}%`
                                : '0%'}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Latency:</span>
                          <div className="font-semibold">{box.stats.avgLatency.toFixed(0)}ms</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Tokens:</span>
                          <div className="font-semibold">{box.stats.totalTokens.toLocaleString()}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <div className="font-semibold">
                            {getDuration()}s
                          </div>
                        </div>
                      </div>
                    </div>
                )}

                {box.logs.length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Terminal className="w-4 h-4 mr-2" />
                        Request Logs ({box.logs.length})
                      </h4>
                      <ScrollArea ref={scrollAreaRef} className="h-64 w-full rounded-md border bg-muted/50">
                        <div className="p-3 space-y-2">
                          {box.logs.map((log) => (
                              <motion.div
                                  key={log.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex items-start space-x-2 text-sm p-2 rounded-md bg-background/50"
                              >
                                <div className="flex-shrink-0 mt-0.5">
                                  {getLogStatusIcon(log.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-muted-foreground">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                                    {log.duration && (
                                        <Badge variant="outline" className="text-xs">
                                          {log.duration}ms
                                        </Badge>
                                    )}
                                  </div>
                                  <div className="font-medium">
                                    Request to {log.model}
                                  </div>
                                  <div className="text-muted-foreground truncate">
                                    {log.prompt}
                                  </div>
                                  {log.error && (
                                      <div className="text-red-500 text-xs mt-1">
                                        Error: {log.error}
                                      </div>
                                  )}
                                  {log.tokens && (
                                      <div className="text-xs text-muted-foreground">
                                        {log.tokens} tokens
                                      </div>
                                  )}
                                  {log.statusCode && (
                                      <Badge
                                          variant={log.statusCode >= 200 && log.statusCode < 300 ? "success" : "destructive"}
                                          className="text-xs mt-1"
                                      >
                                        HTTP {log.statusCode}
                                      </Badge>
                                  )}
                                </div>
                              </motion.div>
                          ))}
                          <div ref={logsEndRef} />
                        </div>
                      </ScrollArea>
                    </div>
                )}

                {box.status === 'completed' && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-3 flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Simulation Summary
                      </h4>
                      <div className="rounded-lg overflow-hidden border bg-gray-900">
                        <MonacoEditor
                            height="300px"
                            language="json"
                            theme="vs-dark"
                            value={JSON.stringify({
                              simulationId: box.id,
                              name: box.name,
                              status: box.status,
                              configuration: {
                                model: box.config.model,
                                requestCount: box.config.requestCount,
                                requestInterval: box.config.requestInterval,
                                burstMode: box.config.enableBurst,
                                burstSize: box.config.burstSize,
                                burstInterval: box.config.burstInterval,
                                randomPrompts: box.config.useRandomPrompt,
                              },
                              results: {
                                totalRequests: box.stats.totalRequests,
                                successfulRequests: box.stats.successCount,
                                failedRequests: box.stats.errorCount,
                                successRate: `${((box.stats.successCount / box.stats.totalRequests) * 100).toFixed(2)}%`,
                                averageLatency: `${box.stats.avgLatency.toFixed(2)}ms`,
                                totalTokens: box.stats.totalTokens,
                                duration: box.stats.startTime && box.stats.endTime
                                    ? `${Math.round((box.stats.endTime.getTime() - box.stats.startTime.getTime()) / 1000)}s`
                                    : 'N/A',
                              },
                              logs: box.logs.map(log => ({
                                timestamp: log.timestamp,
                                status: log.status,
                                duration: log.duration,
                                model: log.model,
                                tokens: log.tokens,
                                error: log.error,
                              })),
                              timestamp: new Date().toISOString(),
                            }, null, 2)}
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              scrollBeyondLastLine: false,
                              fontSize: 12,
                              wordWrap: 'on',
                              lineNumbers: 'off',
                              folding: true,
                            }}
                        />
                      </div>
                    </div>
                )}
              </CardContent>
          )}
        </Card>
      </motion.div>
  );
}