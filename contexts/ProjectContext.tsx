'use client';

import { createContext, useContext } from 'react';
import { Project, ProjectRole } from '@prisma/client';
import { ProjectPermission } from '@/lib/permissions';

type ProjectWithRole = Project & { userRole: ProjectRole };

interface ProjectContextType {
    project: ProjectWithRole | null;
    can: (permission: ProjectPermission) => boolean;
}

export const ProjectContext = createContext<ProjectContextType | null>(null);

export const useProjectContext = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error("useProjectContext must be used within a ProjectSettingsLayout");
    }
    return context;
};