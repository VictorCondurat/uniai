'use client';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useProjectContext } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const settingsFormSchema = z.object({
    name: z.string().min(3, 'Project name must be at least 3 characters.'),
    description: z.string().optional(),
    totalSpendingLimit: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

export default function ProjectGeneralSettingsPage() {
    const { project, can } = useProjectContext();
    const router = useRouter();

    const form = useForm<SettingsFormData>({
        resolver: zodResolver(settingsFormSchema),
        defaultValues: {
            name: project?.name || '',
            description: project?.description || '',
            totalSpendingLimit: project?.totalSpendingLimit?.toString() || '',
        },
    });

    const onSubmit: SubmitHandler<SettingsFormData> = async (data) => {
        const toastId = toast.loading('Saving project settings...');
        try {
            let totalSpendingLimit: number | null = null;
            if (data.totalSpendingLimit && data.totalSpendingLimit.trim() !== '') {
                const parsed = parseFloat(data.totalSpendingLimit);
                if (isNaN(parsed) || parsed <= 0) {
                    throw new Error('Spending limit must be a positive number.');
                }
                totalSpendingLimit = parsed;
            }

            const transformedData = {
                name: data.name,
                description: data.description,
                totalSpendingLimit,
            };

            const res = await fetch(`/api/projects/${project!.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transformedData),
            });

            if (!res.ok) throw new Error((await res.json()).error);
            toast.success('Settings saved successfully!', { id: toastId });
        } catch (error) {
            toast.error('Failed to save settings', {
                id: toastId,
                description: error instanceof Error ? error.message : ''
            });
        }
    };

    const handleDeleteProject = async () => {
        const toastId = toast.loading('Deleting project...');
        try {
            const response = await fetch(`/api/projects/${project!.id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to delete project');
            toast.success('Project deleted successfully', { id: toastId });
            router.push('/dashboard/projects');
        } catch (err) {
            toast.error('Deletion failed', {
                id: toastId,
                description: err instanceof Error ? err.message : ''
            });
        }
    };

    return (
        <div className="space-y-6">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>General Settings</CardTitle>
                            <CardDescription>
                                Update your project&#39;s name, description, and spending limits.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                name="name"
                                control={form.control}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Project Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                disabled={!can('project:update')}
                                            />
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
                                            <Textarea
                                                {...field}
                                                disabled={!can('project:update')}
                                            />
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
                                                placeholder="e.g., 500"
                                                {...field}
                                                disabled={!can('project:manage-spending-limits')}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Set a total spending limit for this project. Leave blank for no limit.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <Button
                                type="submit"
                                disabled={!can('project:update') || form.formState.isSubmitting}
                            >
                                Save Changes
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>

            {can('project:delete') && (
                <Card className="border-destructive">
                    <CardHeader>
                        <CardTitle>Danger Zone</CardTitle>
                        <CardDescription>
                            These actions are permanent and cannot be undone.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Project
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                </AlertDialogHeader>
                                <AlertDialogDescription>
                                    This will permanently delete the <strong>{project?.name}</strong> project,
                                    all of its API keys, and associated usage data. This action cannot be undone.
                                </AlertDialogDescription>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDeleteProject}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        Yes, delete this project
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}