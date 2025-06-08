'use client';

import { FC, useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from 'lucide-react';

interface ProjectFromAPI {
    id: string; name: string; description: string | null; tags: string[];
    totalSpendingLimit: number | null; allowedModels: string[];
}
interface ModelAPI { id: string; name: string; provider: string; }
interface ModelProviderAPI { id: string; name: string; models: ModelAPI[]; }
interface GroupedModels { [providerId: string]: { providerName: string; models: ModelAPI[]; }; }

// Simplified schema without z.preprocess
const projectFormSchema = z.object({
    name: z.string().min(3, { message: "Project name must be at least 3 characters." }),
    description: z.string().optional(),
    tags: z.string().optional(),
    totalSpendingLimit: z.string().optional(), // Change to string
    allowedModels: z.array(z.string()),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

interface CreateEditProjectModalProps {
    project: ProjectFromAPI | null;
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
}

export const CreateEditProjectModal: FC<CreateEditProjectModalProps> = ({ project, isOpen, onClose, onSaveSuccess }) => {
    const isEditMode = !!project;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfigLoading, setIsConfigLoading] = useState(true);
    const [groupedModels, setGroupedModels] = useState<GroupedModels>({});

    const form = useForm<ProjectFormData>({
        resolver: zodResolver(projectFormSchema),
        defaultValues: {
            name: '',
            description: '',
            tags: '',
            totalSpendingLimit: '', // Change to empty string
            allowedModels: []
        },
    });

    useEffect(() => {
        async function fetchData() {
            if (!isOpen) return;
            setIsConfigLoading(true);
            try {
                const modelsRes = await fetch('/api/models');
                if (!modelsRes.ok) throw new Error("Failed to load model configuration.");
                const providersData: ModelProviderAPI[] = await modelsRes.json();
                const grouped = providersData.reduce<GroupedModels>((acc, provider) => {
                    acc[provider.id] = { providerName: provider.name, models: provider.models };
                    return acc;
                }, {});
                setGroupedModels(grouped);
            } catch (error) {
                toast.error("Failed to load modal data.", { description: error instanceof Error ? error.message : "Unknown error" });
                onClose();
            } finally {
                setIsConfigLoading(false);
            }
        }
        fetchData();
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen) {
            if (project) {
                form.reset({
                    name: project.name,
                    description: project.description || '',
                    tags: project.tags?.join(', ') || '',
                    totalSpendingLimit: project.totalSpendingLimit?.toString() || '', // Convert to string
                    allowedModels: project.allowedModels || [],
                });
            } else {
                form.reset({
                    name: '',
                    description: '',
                    tags: '',
                    totalSpendingLimit: '',
                    allowedModels: []
                });
            }
        }
    }, [project, isOpen, form]);

    const handleProviderSelectionChange = (providerId: string, isChecked: boolean) => {
        const providerModels = groupedModels[providerId]?.models.map(m => m.id) || [];
        const currentModels = form.getValues('allowedModels');
        const newModels = isChecked ? [...new Set([...currentModels, ...providerModels])] : currentModels.filter(m => !providerModels.includes(m));
        form.setValue('allowedModels', newModels, { shouldValidate: true, shouldDirty: true });
    };

    const isProviderSelected = (providerId: string) => {
        const providerModels = groupedModels[providerId]?.models.map(m => m.id) || [];
        if (providerModels.length === 0) return false;
        const currentModels = form.watch('allowedModels');
        return providerModels.every(modelId => currentModels.includes(modelId));
    };

    const onSubmit: SubmitHandler<ProjectFormData> = async (data) => {
        setIsSubmitting(true);
        const toastId = toast.loading(isEditMode ? 'Updating project...' : 'Creating project...');

        // Transform totalSpendingLimit here
        let totalSpendingLimit: number | null = null;
        if (data.totalSpendingLimit && data.totalSpendingLimit.trim() !== '') {
            const parsed = parseFloat(data.totalSpendingLimit);
            if (isNaN(parsed) || parsed <= 0) {
                toast.error('Spending limit must be a positive number.', { id: toastId });
                setIsSubmitting(false);
                return;
            }
            totalSpendingLimit = parsed;
        }

        const processedData = {
            name: data.name,
            description: data.description,
            tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            totalSpendingLimit,
            allowedModels: data.allowedModels,
        };

        const url = isEditMode ? `/api/projects/${project!.id}` : '/api/projects';
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(processedData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Something went wrong');
            }
            toast.success(`Project ${isEditMode ? 'updated' : 'created'} successfully!`, { id: toastId });
            onSaveSuccess();
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An unknown error occurred', { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Project' : 'Create New Project'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Update settings for ${project?.name}.` : 'A project helps organize your API keys, members, and usage.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <ScrollArea className="max-h-[70vh] p-1 pr-6">
                            <div className="space-y-4">
                                <FormField
                                    name="name"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Project Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="My Awesome Project" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="description"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="A short description of what this project is for." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="tags"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tags (comma-separated)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="frontend, production, team-a" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    name="totalSpendingLimit"
                                    control={form.control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Total Spending Limit ($)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="e.g., 100"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="allowedModels"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Model Access</FormLabel>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Restrict which models can be used with this project's keys. Leave all unchecked to allow all.
                                            </p>
                                            <div className="space-y-4 border rounded-md p-4 max-h-60 overflow-y-auto">
                                                {isConfigLoading ? (
                                                    <div className="flex items-center justify-center h-24">
                                                        <Loader2 className="w-6 h-6 animate-spin" />
                                                    </div>
                                                ) : (
                                                    Object.entries(groupedModels || {}).map(([providerId, data]) => (
                                                        <div key={providerId}>
                                                            <div className="flex items-center space-x-3">
                                                                <Checkbox
                                                                    id={`provider-${providerId}`}
                                                                    onCheckedChange={(c) => handleProviderSelectionChange(providerId, c === true)}
                                                                    checked={isProviderSelected(providerId)}
                                                                />
                                                                <Label htmlFor={`provider-${providerId}`} className="font-semibold">
                                                                    {data.providerName}
                                                                </Label>
                                                            </div>
                                                            <div className="pl-8 pt-2 space-y-2">
                                                                {data.models.map(model => (
                                                                    <div key={model.id} className="flex items-center space-x-3">
                                                                        <Checkbox
                                                                            id={`model-${model.id}`}
                                                                            checked={field.value?.includes(model.id)}
                                                                            onCheckedChange={checked => {
                                                                                const updated = checked
                                                                                    ? [...field.value, model.id]
                                                                                    : field.value?.filter(v => v !== model.id);
                                                                                field.onChange(updated);
                                                                            }}
                                                                        />
                                                                        <Label htmlFor={`model-${model.id}`} className="font-normal">
                                                                            {model.name}
                                                                        </Label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </ScrollArea>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting || isConfigLoading}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Project
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};