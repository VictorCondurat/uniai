'use client';
import {useState, useEffect, FC, useCallback} from 'react';
import {toast} from 'sonner';
import {useRouter} from 'next/navigation';
import {Project, ProjectRole} from '@prisma/client';
import {formatDistanceToNow} from 'date-fns';
import {useProjectPermissions} from '@/hooks/useProjectPermissions';
import {Button} from '@/components/ui/button';
import { DollarSign, AlertTriangle, Loader2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogTrigger,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Skeleton} from '@/components/ui/skeleton';
import {Badge} from '@/components/ui/badge';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';
import {ScrollArea} from '@/components/ui/scroll-area';
import {ProviderIcon} from '@/components/ui/provider-icon';
import {CreateEditProjectModal} from '@/components/dashboard/projects/CreateEditProjectModal';
import {ManageMembersModal} from '@/components/dashboard/projects/ManageMembersModal';
import {Key, Users, Plus, Edit, Trash2, Cpu, Braces, Tag, BarChart3} from 'lucide-react';

interface ModelInfo {
    id: string;
    name: string;
    provider: string;
}

type ProjectDataFromAPI = Project & {
    _count: { apiKeys: number; fallbackChains: number; members: number; };
    userRole: ProjectRole;
    owner: { id: string; name: string | null; };
};

interface ProjectData {
    owned: ProjectDataFromAPI[];
    memberOf: ProjectDataFromAPI[];
}

const DetailItem: FC<{ icon: React.ElementType; label: string; children: React.ReactNode }> = ({
                                                                                                   icon: Icon,
                                                                                                   label,
                                                                                                   children
                                                                                               }) => (
    <div>
        <div className="flex items-center text-sm font-medium text-muted-foreground mb-2"><Icon
            className="w-4 h-4 mr-2"/><span>{label}</span></div>
        <div className="pl-6">{children}</div>
    </div>
);

export default function ProjectsPage() {
    const router = useRouter();
    const [projectData, setProjectData] = useState<ProjectData>({owned: [], memberOf: []});
    const [allModels, setAllModels] = useState<ModelInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [createEditModalOpen, setCreateEditModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<ProjectDataFromAPI | null>(null);
    const [manageMembersModalOpen, setManageMembersModalOpen] = useState(false);
    const [managingMembersProject, setManagingMembersProject] = useState<ProjectDataFromAPI | null>(null);
    const [projectUsageData, setProjectUsageData] = useState<Record<string, any>>({});
    const [loadingUsage, setLoadingUsage] = useState<Record<string, boolean>>({});

    const fetchProjectUsage = async (projectId: string) => {
        setLoadingUsage(prev => ({ ...prev, [projectId]: true }));
        try {
            const res = await fetch(`/api/projects/${projectId}/stats?days=30`);
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setProjectUsageData(prev => ({
                ...prev,
                [projectId]: {
                    totalSpent: data.overview.totalSpent,
                    totalSpendingLimit: data.overview.totalSpendingLimit,
                    percentageUsed: data.overview.percentageOfLimit,
                    limitExceeded: data.overview.spendingLimitExceeded
                }
            }));
        } catch (error) {
            console.error(`Failed to fetch stats for project ${projectId}:`, error);
        } finally {
            setLoadingUsage(prev => ({ ...prev, [projectId]: false }));
        }
    };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [projectsRes, modelsRes] = await Promise.all([fetch('/api/projects'), fetch('/api/models')]);
            if (!projectsRes.ok) throw new Error('Failed to fetch projects');
            if (!modelsRes.ok) throw new Error('Failed to fetch models');
            const projects = await projectsRes.json();
            const modelProviders = await modelsRes.json();

            const flattenedModels = modelProviders.flatMap((p: any) => p.models.map((m: any) => ({
                ...m,
                provider: p.providerId
            })));
            setProjectData(projects);
            setAllModels(flattenedModels);

            const allProjects = [...projects.owned, ...projects.memberOf];
            allProjects.forEach(project => {
                if (project.totalSpendingLimit !== null) {
                    fetchProjectUsage(project.id);
                }
            });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'An error occurred while loading data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenCreateModal = () => {
        setEditingProject(null);
        setCreateEditModalOpen(true);
    };
    const handleOpenEditModal = (project: ProjectDataFromAPI) => {
        setEditingProject(project);
        setCreateEditModalOpen(true);
    };
    const handleOpenMembersModal = (project: ProjectDataFromAPI) => {
        setManagingMembersProject(project);
        setManageMembersModalOpen(true);
    };

    const handleDeleteProject = async (projectId: string) => {
        const toastId = toast.loading('Deleting project...');
        try {
            const response = await fetch(`/api/projects/${projectId}`, {method: 'DELETE'});
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to delete project');
            toast.success('Project deleted successfully', {id: toastId});
            fetchData();
        } catch (err) {
            toast.error('Deletion failed', {id: toastId, description: err instanceof Error ? err.message : ''});
        }
    };
    const UsageProgressBar: FC<{
        current: number;
        limit: number | null;
        projectId: string;
    }> = ({ current, limit, projectId }) => {
        if (limit === null) return null;

        const percentage = Math.min((current / limit) * 100, 100);
        const remaining = Math.max(limit - current, 0);
        const isExceeded = current >= limit;

        const colorClass = isExceeded
            ? 'bg-red-500'
            : percentage > 80
                ? 'bg-yellow-500'
                : 'bg-green-500';

        const bgClass = isExceeded
            ? 'bg-red-100 dark:bg-red-950'
            : percentage > 80
                ? 'bg-yellow-100 dark:bg-yellow-950'
                : 'bg-gray-100 dark:bg-gray-800';

        return (
            <div className="w-full space-y-1">
                <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Spending Limit
                </span>
                    <div className="flex items-center gap-2">
                        {isExceeded && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Spending limit exceeded</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <span className={`font-medium ${isExceeded ? 'text-red-600' : ''}`}>
                        ${current.toFixed(2)} / ${limit.toFixed(2)}
                    </span>
                        {loadingUsage[projectId] && <Loader2 className="w-3 h-3 animate-spin" />}
                    </div>
                </div>
                <div className={`w-full h-2 rounded-full ${bgClass} overflow-hidden`}>
                    <div
                        className={`h-full ${colorClass} transition-all duration-300 ease-out`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    {isExceeded
                        ? `Exceeded by $${(current - limit).toFixed(2)}`
                        : `$${remaining.toFixed(2)} remaining`}
                </p>
            </div>
        );
    };
    const ProjectCard: FC<{ project: ProjectDataFromAPI }> = ({project}) => {
        const {can} = useProjectPermissions(project.userRole);
        const modelsToShow = project.allowedModels.length > 0 ? allModels.filter(m => project.allowedModels.includes(m.id)) : [];

        return (
            <Card
                className="flex flex-col h-full bg-card/80 backdrop-blur-sm border-border/20 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <div
                            className="cursor-pointer"
                            onClick={() => router.push(`/dashboard/projects/${project.id}/settings`)}
                        >
                            <CardTitle className="text-lg tracking-tight">
                                {project.name}
                            </CardTitle>
                        </div>
                        <CardDescription>Updated {formatDistanceToNow(new Date(project.updatedAt), {addSuffix: true})}</CardDescription>
                    </div>
                    <Badge variant={project.userRole === 'OWNER' ? "success" : "secondary"}>
                        {project.userRole}
                    </Badge>
                </CardHeader>
                <CardContent className="flex-grow space-y-5">
                    <p className="text-sm text-muted-foreground h-10 line-clamp-2">{project.description || 'No description provided.'}</p>
                    <div className="flex flex-wrap gap-1.5">{project.tags.slice(0, 4).map(tag => <Badge key={tag}
                                                                                                        variant="outline"
                                                                                                        className="font-normal"><Tag
                        className="w-3 h-3 mr-1"/>{tag}</Badge>)}</div>
                    <div className="border-t border-border/20"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <DetailItem icon={Users} label="Team"><span
                            className="font-semibold">{project._count.members}</span> member(s)</DetailItem>
                        <DetailItem icon={Key} label="Access"><span
                            className="font-semibold">{project._count.apiKeys}</span> API key(s)</DetailItem>
                        <div className="md:col-span-2">
                            <DetailItem icon={Cpu} label="Model Access">
                                <ScrollArea className="h-24 pr-4">
                                    <div className="flex flex-col space-y-2">
                                        {modelsToShow.length > 0 ? modelsToShow.map(m => (
                                            <div key={m.id} className="flex items-center text-sm"><ProviderIcon
                                                provider={m.provider} className="w-4 h-4 mr-2"/><span
                                                className="truncate">{m.name}</span></div>
                                        )) : <div className="text-sm text-muted-foreground">All models allowed.</div>}
                                    </div>
                                </ScrollArea>
                            </DetailItem>
                        </div>
                    </div>
                    {project.totalSpendingLimit !== null && projectUsageData[project.id] && (
                        <div className="pt-2">
                            <UsageProgressBar
                                current={projectUsageData[project.id].totalSpent}
                                limit={project.totalSpendingLimit}
                                projectId={project.id}
                            />
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex items-center justify-end bg-muted/50 border-t border-border/20 p-2">
                    <TooltipProvider delayDuration={100}>
                        <div className="flex items-center space-x-1">
                            {can('members:read') && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon"
                                                                                             onClick={() => handleOpenMembersModal(project)}><Users
                                className="w-4 h-4"/></Button></TooltipTrigger><TooltipContent>Manage
                                Members</TooltipContent></Tooltip>}
                            {can('api-keys:read') &&
                                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon"
                                                                         onClick={() => router.push(`/dashboard/projects/${project.id}/keys`)}><Key
                                    className="w-4 h-4"/></Button></TooltipTrigger><TooltipContent>Manage API
                                    Keys</TooltipContent></Tooltip>}
                            {can('usage:read') && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon"
                                                                                           onClick={() => router.push(`/dashboard/projects/${project.id}/usage`)}><BarChart3
                                className="w-4 h-4"/></Button></TooltipTrigger><TooltipContent>View
                                Usage</TooltipContent></Tooltip>}
                            {can('project:update') &&
                                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon"
                                                                         onClick={() => handleOpenEditModal(project)}><Edit
                                    className="w-4 h-4"/></Button></TooltipTrigger><TooltipContent>Edit
                                    Settings</TooltipContent></Tooltip>}
                            {can('project:delete') &&
                                <Tooltip><TooltipTrigger asChild><AlertDialog><AlertDialogTrigger asChild><Button
                                    variant="ghost" size="icon"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2
                                    className="w-4 h-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete
                                    "{project.name}"?</AlertDialogTitle></AlertDialogHeader><AlertDialogDescription>This
                                    action cannot be undone and will permanently delete all associated
                                    data.</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction
                                    onClick={() => handleDeleteProject(project.id)}
                                    className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TooltipTrigger><TooltipContent>Delete
                                    Project</TooltipContent></Tooltip>}
                        </div>
                    </TooltipProvider>
                </CardFooter>
            </Card>
        );
    };

    const renderProjectGrid = (projects: ProjectDataFromAPI[]) => {
        if (isLoading) return <div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({length: 4}).map((_, i) =>
            <Skeleton key={i} className="h-[28rem] w-full"/>)}</div>;
        if (!projects.length) return <div className="text-center py-16"><Braces
            className="w-16 h-16 text-muted-foreground mx-auto mb-4"/><h3 className="text-xl font-semibold">No Projects
            Here</h3><p className="text-muted-foreground">Get started by creating a new project.</p></div>;
        return <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{projects.map(p => <ProjectCard
            key={p.id} project={p}/>)}</div>;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                <Button onClick={handleOpenCreateModal}><Plus className="w-4 h-4 mr-2"/>New Project</Button>
            </div>
            <Tabs defaultValue="owned" className="w-full">
                <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="owned">Owned by
                    me</TabsTrigger><TabsTrigger value="memberOf">Shared with me</TabsTrigger></TabsList>
                <TabsContent value="owned" className="mt-6">{renderProjectGrid(projectData.owned)}</TabsContent>
                <TabsContent value="memberOf" className="mt-6">{renderProjectGrid(projectData.memberOf)}</TabsContent>
            </Tabs>
            <CreateEditProjectModal project={editingProject} isOpen={createEditModalOpen}
                                    onClose={() => setCreateEditModalOpen(false)} onSaveSuccess={fetchData}/>
            <ManageMembersModal project={managingMembersProject} isOpen={manageMembersModalOpen}
                                onClose={() => setManageMembersModalOpen(false)} onUpdate={fetchData}/>
        </div>
    );
}