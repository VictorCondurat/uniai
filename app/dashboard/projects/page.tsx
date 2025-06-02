'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import {
    FolderOpen,
    MoreVertical,
    Settings,
    Trash2,
    Key,
    Link,
    TrendingUp,
    AlertCircle,
    Plus,
    Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Project {
    id: string;
    name: string;
    description?: string;
    spendingLimit?: number;
    createdAt: string;
    updatedAt: string;
    _count?: {
        apiKeys: number;
        modelChains: number;
    };
    currentSpend?: number;
}

export default function ProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        spendingLimit: '',
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const response = await fetch('/api/projects');
            const data = await response.json();

            if (Array.isArray(data)) {
                setProjects(data);
            } else {
                setProjects([]);

                toast.error('Unexpected response format from server');
            }
        } catch (error) {

            toast.error('Failed to fetch projects');
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async () => {
        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description || undefined,
                    spendingLimit: formData.spendingLimit
                        ? parseFloat(formData.spendingLimit)
                        : undefined,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create project');
            }

            const newProject = await response.json();
            setProjects([newProject, ...projects]);
            setCreateDialogOpen(false);
            resetForm();

            toast.success('Project created successfully');
        } catch (error) {

            toast.error('Failed to create project');
        }
    };

    const handleUpdateProject = async () => {
        if (!editingProject) return;

        try {
            const response = await fetch(`/api/projects/${editingProject.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    description: formData.description || undefined,
                    spendingLimit: formData.spendingLimit
                        ? parseFloat(formData.spendingLimit)
                        : undefined,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update project');
            }

            const updatedProject = await response.json();
            setProjects(projects.map((p) => (p.id === editingProject.id ? updatedProject : p)));
            setEditingProject(null);
            resetForm();

            toast.success('Project updated successfully');
        } catch (error) {
            toast.error('Failed to update project');
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete project');
            }

            setProjects(projects.filter((p) => p.id !== projectId));
            toast.success('Project deleted successfully');
        } catch (error) {
            toast.error('Failed to delete project' + error);
        }
    };

    const openEditDialog = (project: Project) => {
        setEditingProject(project);
        setFormData({
            name: project.name,
            description: project.description || '',
            spendingLimit: project.spendingLimit?.toString() || '',
        });
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            spendingLimit: '',
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const calculateSpendingProgress = (currentSpend?: number, limit?: number) => {
        if (!limit || !currentSpend) return 0;
        return Math.min((currentSpend / limit) * 100, 100);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Organize your API usage and configurations by project
                    </p>
                </div>
                <Dialog
                    open={createDialogOpen || !!editingProject}
                    onOpenChange={(open) => {
                        if (!open) {
                            setCreateDialogOpen(false);
                            setEditingProject(null);
                            resetForm();
                        } else {
                            setCreateDialogOpen(true);
                        }
                    }}
                >
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            New Project
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingProject ? 'Edit Project' : 'Create New Project'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingProject
                                    ? 'Update your project details'
                                    : 'Set up a new project to organize your API usage'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name">Project Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="My AI Project"
                                />
                            </div>

                            <div>
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    placeholder="Describe your project..."
                                    rows={3}
                                />
                            </div>

                            <div>
                                <Label htmlFor="spendingLimit">Monthly Spending Limit ($)</Label>
                                <Input
                                    id="spendingLimit"
                                    type="number"
                                    value={formData.spendingLimit}
                                    onChange={(e) =>
                                        setFormData({ ...formData, spendingLimit: e.target.value })
                                    }
                                    placeholder="1000"
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    Leave empty for unlimited spending
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setCreateDialogOpen(false);
                                    setEditingProject(null);
                                    resetForm();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={editingProject ? handleUpdateProject : handleCreateProject}>
                                {editingProject ? 'Update' : 'Create'} Project
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                    <Card key={project.id} className="relative overflow-hidden">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg">{project.name}</CardTitle>
                                    {project.description && (
                                        <CardDescription className="text-sm">
                                            {project.description}
                                        </CardDescription>
                                    )}
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => router.push(`/projects/${project.id}`)}
                                        >
                                            <Settings className="w-4 h-4 mr-2" />
                                            View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openEditDialog(project)}>
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit Project
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => router.push(`/projects/${project.id}/api-keys`)}
                                        >
                                            <Key className="w-4 h-4 mr-2" />
                                            API Keys
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => router.push(`/projects/${project.id}/model-chains`)}
                                        >
                                            <Link className="w-4 h-4 mr-2" />
                                            Model Chains
                                        </DropdownMenuItem>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <DropdownMenuItem
                                                    onSelect={(e) => e.preventDefault()}
                                                    className="text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete Project
                                                </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the
                                                        project and all associated data including API keys, model
                                                        chains, and usage history.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDeleteProject(project.id)}
                                                        className="bg-destructive text-destructive-foreground"
                                                    >
                                                        Delete Project
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-2xl font-semibold">
                                        {project._count?.apiKeys || 0}
                                    </p>
                                    <p className="text-xs text-gray-500">API Keys</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold">
                                        {project._count?.modelChains || 0}
                                    </p>
                                    <p className="text-xs text-gray-500">Model Chains</p>
                                </div>
                            </div>

                            {project.spendingLimit && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Monthly Spending</span>
                                        <span className="font-medium">
                      ${project.currentSpend?.toFixed(2) || '0.00'} / ${project.spendingLimit}
                    </span>
                                    </div>
                                    <Progress
                                        value={calculateSpendingProgress(project.currentSpend, project.spendingLimit)}
                                        className="h-2"
                                    />
                                    {project.currentSpend && project.spendingLimit &&
                                        project.currentSpend > project.spendingLimit * 0.8 && (
                                            <div className="flex items-center gap-1 text-xs text-amber-600">
                                                <AlertCircle className="w-3 h-3" />
                                                <span>Approaching spending limit</span>
                                            </div>
                                        )}
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
                                <span>Created {formatDate(project.createdAt)}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/projects/${project.id}`)}
                                >
                                    View Details
                                    <TrendingUp className="w-3 h-3 ml-1" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {projects.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-8">
                            <FolderOpen className="w-12 h-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No projects yet</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Create your first project to get started
                            </p>
                            <Button onClick={() => setCreateDialogOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create Project
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>

            {projects.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Total Projects</p>
                                <p className="text-2xl font-semibold">{projects.length}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total API Keys</p>
                                <p className="text-2xl font-semibold">
                                    {projects.reduce((acc, p) => acc + (p._count?.apiKeys || 0), 0)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Model Chains</p>
                                <p className="text-2xl font-semibold">
                                    {projects.reduce((acc, p) => acc + (p._count?.modelChains || 0), 0)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Monthly Spend</p>
                                <p className="text-2xl font-semibold">
                                    ${projects.reduce((acc, p) => acc + (p.currentSpend || 0), 0).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}