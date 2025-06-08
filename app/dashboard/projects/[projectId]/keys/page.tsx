'use client';

import { useProjectContext } from '@/contexts/ProjectContext';
import { ApiKeyManager } from '@/components/dashboard/keys/ApiKeyManager';
import { Loader2 } from 'lucide-react';

export default function ProjectKeysPage() {
    const { project, can } = useProjectContext();

    if (!project) {
        return <div className="flex justify-center items-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
    }

    return <ApiKeyManager projectId={project.id} can={can} />;
}