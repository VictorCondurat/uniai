import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware, checkProjectPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ProjectRole } from '@prisma/client';
import { sendProjectInviteEmail } from '@/lib/email';
import { auditHelpers } from '@/lib/audit';
import { AUDIT_ACTIONS } from '@/types/audit';

export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
    const startTime = Date.now();
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;

    const hasPermission = await checkProjectPermission(authResult.id, params.projectId, 'members:read');
    if (!hasPermission) {
        return NextResponse.json({ error: 'Access denied. You do not have permission to view members.' }, { status: 403 });
    }

    const members = await prisma.projectMember.findMany({
        where: { projectId: params.projectId },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
        orderBy: { createdAt: 'asc' },
    });
    await auditHelpers.logProjectAction(
        authResult.id,
        AUDIT_ACTIONS.ROUTE_ACCESSED,
        params.projectId,
        {
            action: 'project_members_viewed',
            membersCount: members.length,
            roleDistribution: members.reduce((acc, member) => {
                acc[member.role] = (acc[member.role] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            duration: Date.now() - startTime,
        },
        req
    );

    return NextResponse.json(members);
}

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
    const startTime = Date.now()
    const authResult = await authMiddleware(req);
    if (authResult instanceof NextResponse) return authResult;
    const hasPermission = await checkProjectPermission(authResult.id, params.projectId, 'members:invite');
    if (!hasPermission) {
        return NextResponse.json({ error: 'You do not have permission to invite members to this project.' }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
        where: { id: params.projectId },
        select: { name: true }
    });

    if (!project) {
        return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }

    const { email, role } = await req.json();
    if (!email || !role || !Object.values(ProjectRole).includes(role) || role === ProjectRole.OWNER) {
        return NextResponse.json({ error: 'A valid email and a role (other than Owner) are required.' }, { status: 400 });
    }

    const userToInvite = await prisma.user.findUnique({ where: { email } });
    if (!userToInvite) {
        return NextResponse.json({ error: `User with email ${email} not found. Please ask them to sign up first.` }, { status: 404 });
    }

    try {
        const newMember = await prisma.projectMember.create({
            data: {
                projectId: params.projectId,
                userId: userToInvite.id,
                role: role as ProjectRole,
                permissions: {}
            },
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
        });

        await auditHelpers.logProjectMemberAction(
            authResult.id,
            AUDIT_ACTIONS.PROJECT_MEMBER_ADDED,
            newMember.id,
            {
                projectId: params.projectId,
                projectName: project.name,
                memberEmail: email,
                memberName: userToInvite.name,
                assignedRole: role,
                invitedById: authResult.id,
                inviterName: authResult.name,
                duration: Date.now() - startTime,
            },
            req
        );

        try {
            await sendProjectInviteEmail({
                toEmail: userToInvite.email,
                inviterName: authResult.name || 'A team member',
                projectName: project.name,
                projectRole: role,
                projectId: params.projectId,
            });
        } catch (emailError) {
            console.error(`Failed to send project invitation email to ${userToInvite.email}:`, emailError);
        }
        return NextResponse.json(newMember, { status: 201 });
    } catch (error) {
        console.error("Error adding member:", error);

        return NextResponse.json({ error: 'User is already a member of this project.' }, { status: 409 });
    }
}