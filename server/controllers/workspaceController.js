import prisma from "../configs/prisma.js";

// Get all workspaces for user
export const getUserWorkspaces = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const workspaces = await prisma.workspace.findMany({
            where: {
                members: { some: { userId: userId } },
            },
            include: {
                members: { include: { user: true } },
                projects: {
                    include: {
                        tasks: { include: { assignee: true, comments: { include: { user: true } } } },
                        members: { include: { user: true } }
                    }
                },
                owner: true
            }
        });
        res.json({ workspaces });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
}

// Add member to workspace
export const addMember = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { email, role, workspaceId, message } = req.body;

        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email: email } });

        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        if (!workspaceId || !role) { 
            return res.status(400).json({ message: "Missing required parameters" })
        }

        if (!["ADMIN", "MEMBER"].includes(role)) {
            return res.status(400).json({ message: "Invalid role" })
        }

        // Fetch workspace
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { members: true } // ✅ true not ture
        })

        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found" })
        }

        // Check requester has admin role
        if (!workspace.members.find((member) => member.userId === userId && member.role === "ADMIN")) {
            return res.status(401).json({ message: "You do not have admin privileges" })
        }

        // Check if user is already a member
        const existingMember = workspace.members.find((member) => member.userId === user.id) // ✅ user.id not userId

        if (existingMember) { // ✅ fixed typo
            return res.status(400).json({ message: "User is already a member" })
        }

        const member = await prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId,
                role,
                message
            }
        })

        res.json({ member, message: "Member added successfully" })

    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: error.code || error.message // ✅ fixed typo
        })
    }
}

// Sync Clerk org membership with workspace
export const syncOrgMembership = async (req, res) => {
    try {
        const auth = await req.auth();
        const { userId, orgId } = auth;

        if (!userId) {
            return res.status(400).json({ message: "User not found" });
        }

        if (!orgId) {
            return res.json({ message: "User not part of any organization", synced: false });
        }

        // The workspace ID is the same as the Clerk org ID (set by inngest)
        const workspace = await prisma.workspace.findUnique({
            where: { id: orgId },
            include: { members: true }
        });

        if (!workspace) {
            return res.json({ message: "No workspace found for this organization", synced: false });
        }

        // Check if user is already a member
        const existingMember = workspace.members.find(m => m.userId === userId);

        if (existingMember) {
            return res.json({ message: "User already a member", synced: true, workspaceId: workspace.id });
        }

        // Add user as member (default: MEMBER role)
        await prisma.workspaceMember.create({
            data: {
                userId,
                workspaceId: workspace.id,
                role: "MEMBER"
            }
        });

        res.json({ message: "User synced to workspace successfully", synced: true, workspaceId: workspace.id });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
}