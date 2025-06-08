'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Key, Settings, Users, BarChart3, Shield, Loader2, GitBranch } from 'lucide-react';
import Link from 'next/link';

import { useProjectPermissions } from '@/hooks/useProjectPermissions';
import { Button } from '@/components/ui/button';
import { Project, ProjectRole } from '@prisma/client';
import { ProjectPermission } from '@/lib/permissions';
import { ProjectContext,useProjectContext } from '@/contexts/ProjectContext';

type ProjectWithRole = Project & { userRole: ProjectRole };

const ProjectSettingsNav = () => {
    const { project, can } = useProjectContext();
    const pathname = usePathname();
    if (!project) return null;

    const navLinks: { href: string; label: string; icon: React.ElementType; permission: ProjectPermission }[] = [
        { href: `/dashboard/projects/${project.id}/settings`, label: 'General', icon: Settings, permission: 'project:read' },
        { href: `/dashboard/projects/${project.id}/members`, label: 'Members', icon: Users, permission: 'members:read' },
        { href: `/dashboard/projects/${project.id}/keys`, label: 'API Keys', icon: Key, permission: 'api-keys:read' },
        { href: `/dashboard/projects/${project.id}/usage`, label: 'Usage', icon: BarChart3, permission: 'usage:read' },
        { href: `/dashboard/projects/${project.id}/fallbacks`, label: 'Fallbacks', icon: GitBranch, permission: 'fallbacks:read' },
        { href: `/dashboard/projects/${project.id}/billing`, label: 'Billing', icon: Shield, permission: 'billing:read' },
    ];

    return (
        <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => can(link.permission) && (
                <Link key={link.href} href={link.href} passHref>
                    <Button variant={pathname.startsWith(link.href) ? 'secondary' : 'ghost'} className="w-full justify-start">
                        <link.icon className="mr-2 h-4 w-4" />{link.label}
                    </Button>
                </Link>
            ))}
        </nav>
    );
};

export default function ProjectSettingsLayout({ children }: { children: ReactNode }) {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;

    const [project, setProject] = useState<ProjectWithRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) return;

        const fetchProjectData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const projectRes = await fetch(`/api/projects/${projectId}`);
                if (!projectRes.ok) {
                    const errorData = await projectRes.json();
                    throw new Error(errorData.error || "Project not found or you don't have access.");
                }
                const projectData: Project = await projectRes.json();

                const membersRes = await fetch(`/api/projects/${projectId}/members`);
                if (!membersRes.ok) {
                    throw new Error("Could not verify your role in this project.");
                }

                const allProjectsRes = await fetch('/api/projects');
                const allProjectsData = await allProjectsRes.json();
                const allUserProjects = [...allProjectsData.owned, ...allProjectsData.memberOf];
                const currentProject = allUserProjects.find(p => p.id === projectId);

                if (!currentProject) {
                    throw new Error("Could not find your membership for this project.");
                }

                setProject({
                    ...projectData,
                    userRole: currentProject.userRole,
                });

            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
                setError(errorMessage);
                toast.error('Failed to load project', { description: errorMessage });
                router.push('/dashboard/projects');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjectData();
    }, [projectId, router]);

    const { can } = useProjectPermissions(project?.userRole);

    if (isLoading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (error || !project) {
        return null;
    }

    return (
        <ProjectContext.Provider value={{ project, can }}>
            <div className="space-y-6">
                <div>
                    <Link href="/dashboard/projects" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to all projects
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">{project?.name}</h1>
                    <p className="text-muted-foreground">{project?.description}</p>
                </div>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                    <div className="col-span-1"><ProjectSettingsNav /></div>
                    <div className="col-span-3">{children}</div>
                </div>
            </div>
        </ProjectContext.Provider>
    );
}