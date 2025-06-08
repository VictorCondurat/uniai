import {NextRequest, NextResponse} from 'next/server';
import {authMiddleware, checkProjectPermission} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {auditHelpers} from '@/lib/audit';
import {AUDIT_ACTIONS} from '@/types/audit';

export async function GET(req: NextRequest, {params}: { params: { projectId: string } }) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const user = authResult;

    try {
        const project = await prisma.project.findUnique({
            where: {id: params.projectId},
        });

        if (!project) {
            return NextResponse.json({error: 'Project not found'}, {status: 404});
        }

        const [membersCount, apiKeysCount] = await Promise.all([
            prisma.projectMember.count({ where: { projectId: params.projectId } }),
            prisma.apiKey.count({ where: { projectId: params.projectId } })
        ]);

        await auditHelpers.logProjectAction(
            user.id,
            AUDIT_ACTIONS.ROUTE_ACCESSED,
            params.projectId,
            {
                action: 'project_viewed',
                projectName: project.name,
                membersCount,
                apiKeysCount,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json(project);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await auditHelpers.logProjectAction(
            user.id,
            'project_view_failed' as any,
            params.projectId,
            {
                error: errorMessage,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json({error: "Not implemented as in original file"}, {status: 500});
    }
}

export async function POST(req: NextRequest) {
    return NextResponse.json({error: "POST not applicable to a specific project ID route"}, {status: 405});
}


export async function PUT(req: NextRequest, {params}: { params: { projectId: string } }) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;

    const hasPermission = await checkProjectPermission(authResult.id, params.projectId, 'project:update');
    if (!hasPermission) {
        return NextResponse.json({error: 'You do not have permission to edit this project.'}, {status: 403});
    }

    try {
        const body = await req.json();
        const {name, description, totalSpendingLimit, allowedModels} = body;

        if (!name) {
            return NextResponse.json({error: 'Project name is required'}, {status: 400});
        }
        const existingProject = await prisma.project.findUnique({
            where: {id: params.projectId},
            select: {name: true, description: true, totalSpendingLimit: true, allowedModels: true}
        });
        const updatedProject = await prisma.project.update({
            where: {id: params.projectId},
            data: {
                name,
                description,
                totalSpendingLimit: totalSpendingLimit !== undefined ? parseFloat(totalSpendingLimit) : undefined,
                allowedModels: allowedModels || [],
            },
        });
        const changedFields: string[] = [];
        if (existingProject?.name !== name) changedFields.push('name');
        if (existingProject?.description !== description) changedFields.push('description');
        if (existingProject?.totalSpendingLimit !== totalSpendingLimit) changedFields.push('totalSpendingLimit');
        if (JSON.stringify(existingProject?.allowedModels) !== JSON.stringify(allowedModels)) changedFields.push('allowedModels');

        await auditHelpers.logProjectAction(
            authResult.id,
            AUDIT_ACTIONS.PROJECT_FIELDS_MODIFIED,
            updatedProject.id,
            {
                changedFields,
                oldName: existingProject?.name,
                newName: updatedProject.name,
                oldSpendingLimit: existingProject?.totalSpendingLimit,
                newSpendingLimit: updatedProject.totalSpendingLimit,
                allowedModelsCount: allowedModels?.length || 0,
                duration: Date.now() - startTime,
            },
            req
        );
        await prisma.auditLog.create({
            data: {
                userId: authResult.id,
                action: 'project_updated',
                resource: 'project',
                resourceId: updatedProject.id,
                details: {changes: Object.keys(body)},
            },
        });

        return NextResponse.json(updatedProject);

    } catch (error) {
        console.error(`Error updating project ${params.projectId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await auditHelpers.logProjectAction(
            authResult.id,
            'project_update_failed' as any,
            params.projectId,
            {
                error: errorMessage,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json({error: 'Failed to update project'}, {status: 500});
    }
}

export async function DELETE(req: NextRequest, {params}: { params: { projectId: string } }) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;

    const hasPermission = await checkProjectPermission(authResult.id, params.projectId, 'project:delete');
    if (!hasPermission) {
        return NextResponse.json({error: 'Only the project owner can delete the project.'}, {status: 403});
    }

    try {
        const projectToDelete = await prisma.project.findUnique({
            where: {id: params.projectId},
            select: {name: true, _count: {select: {members: true, apiKeys: true}}}
        });

        await prisma.project.delete({
            where: {id: params.projectId},
        });

        await auditHelpers.logProjectAction(
            authResult.id,
            AUDIT_ACTIONS.PROJECT_DELETED,
            params.projectId,
            {
                projectName: projectToDelete?.name,
                membersCount: projectToDelete?._count.members || 0,
                apiKeysCount: projectToDelete?._count.apiKeys || 0,
                deletedAt: new Date().toISOString(),
                duration: Date.now() - startTime,
            },
            req
        );

        return new NextResponse(null, {status: 204});
    } catch (error) {
        console.error(`Error deleting project ${params.projectId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await auditHelpers.logProjectAction(
            authResult.id,
            'project_deletion_failed' as any,
            params.projectId,
            {
                error: errorMessage,
                duration: Date.now() - startTime,
            },
            req
        );
        return NextResponse.json({error: 'Failed to delete project'}, {status: 500});
    }
}