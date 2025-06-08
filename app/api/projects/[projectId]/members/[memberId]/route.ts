import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, checkProjectPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProjectRole } from '@prisma/client';
import { auditHelpers } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/types/audit';

export async function PUT(req: NextRequest, { params }: { params: { projectId: string, memberId: string } }) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;

    const hasPermission = await checkProjectPermission(authResult.id, params.projectId, 'members:update-role');
    if (!hasPermission) {
        return NextResponse.json({ error: 'You do not have permission to update members.' }, { status: 403 });
    }

    const { role, permissions } = await req.json();
    if (!role && !permissions) {
        return NextResponse.json({ error: 'A role or permissions object must be provided.' }, { status: 400 });
    }

    const memberToUpdate = await prisma.projectMember.findFirst({
        where: { id: params.memberId, projectId: params.projectId }
    });

    if (!memberToUpdate) {
        return NextResponse.json({ error: 'Member not found in this project.' }, { status: 404 });
    }

    if (memberToUpdate.role === 'OWNER') {
        return NextResponse.json({ error: "The project owner's role cannot be changed." }, { status: 403 });
    }

    const dataToUpdate: { role?: ProjectRole, permissions?: any } = {};
    if (role && Object.values(ProjectRole).includes(role) && role !== 'OWNER') {
        dataToUpdate.role = role;
    }
    if (permissions) {
        dataToUpdate.permissions = permissions;
    }

    const updatedMember = await prisma.projectMember.update({
        where: { id: params.memberId },
        data: dataToUpdate,
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });

    await auditHelpers.logProjectMemberAction(
        authResult.id,
        AUDIT_ACTIONS.PROJECT_MEMBER_ROLE_CHANGED,
        params.memberId,
        {
            projectId: params.projectId,
            oldRole: memberToUpdate.role,
            newRole: updatedMember.role,
            changedFields: Object.keys(dataToUpdate),
            permissionsUpdated: !!permissions,
            updatedById: authResult.id,
            updaterName: authResult.name,
            duration: Date.now() - startTime,
        },
        req
    );

    return NextResponse.json(updatedMember);
}

export async function DELETE(req: NextRequest, { params }: { params: { projectId: string, memberId: string } }) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;

    const hasPermission = await checkProjectPermission(authResult.id, params.projectId, 'members:remove');
    if (!hasPermission) {
        return NextResponse.json({ error: 'You do not have permission to remove members.' }, { status: 403 });
    }

    const memberToRemove = await prisma.projectMember.findFirst({
        where: { id: params.memberId, projectId: params.projectId }
    });

    if (!memberToRemove) {
        return NextResponse.json({ error: 'Member not found in this project.' }, { status: 404 });
    }

    if (memberToRemove.role === 'OWNER') {
        return NextResponse.json({ error: 'Cannot remove the project owner.' }, { status: 400 });
    }

    const currentUserMembership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: params.projectId, userId: authResult.id } }
    });

    if (currentUserMembership?.role === 'ADMIN' && memberToRemove.role === 'ADMIN') {
        return NextResponse.json({ error: 'Admins cannot remove other admins. Only the owner can.' }, { status: 403 });
    }

    await prisma.projectMember.delete({ where: { id: params.memberId } });

    await auditHelpers.logProjectMemberAction(
        authResult.id,
        AUDIT_ACTIONS.PROJECT_MEMBER_REMOVED,
        params.memberId,
        {
            projectId: params.projectId,
            removedMemberRole: memberToRemove.role,
            removedById: authResult.id,
            removerName: authResult.name,
            removerRole: currentUserMembership?.role,
            removedAt: new Date().toISOString(),
            duration: Date.now() - startTime,
        },
        req
    );

    return new NextResponse(null, { status: 204 });
}