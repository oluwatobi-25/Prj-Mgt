import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project management" });

//Inngest Function to save user data to a database
const syncUserCreation = inngest.createFunction(
    { id: "sync-user-creation", triggers: [{ event: "clerk/user.created" }] },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.create({
            data: {
                id: data.id,
                name: data?.first_name + " " + data?.last_name,
                email: data?.email_addresses[0]?.email_address,
                image: data?.image_url,
            },
        });
    }
);

//Inngest Function to delete user data to a database
const syncUserDeletion = inngest.createFunction(
    { id: "sync-user-deletion", triggers: [{ event: "clerk/user.deleted" }] },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.deleteMany({
            where: {
                id: data.id,
            },
        });
    }
);

//Inngest Function to update user data to a database
const syncUserUpdation = inngest.createFunction(
    { id: "sync-user-update", triggers: [{ event: "clerk/user.updated" }] },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.update({
            where: {
                id: data.id
            },
        data: {
            email: data?.email_addresses[0]?.email_address,
            name: data?.first_name + " "  + data?.last_name,
            image: data?.image_url
            }
        })
    }
);

//Inngest Function to save workspace data to a database
const syncWorkspaceCreation = inngest.createFunction(
    { id: "sync-workspace-creation", triggers: [{ event: "clerk/organization.created" }] },
    async ({ event }) => {
        const { data } = event;
        const requestedSlug = data.slug || data.id;
        let workspaceSlug = requestedSlug;

        const existingWorkspaceBySlug = await prisma.workspace.findUnique({
            where: { slug: workspaceSlug },
        });

        if (existingWorkspaceBySlug && existingWorkspaceBySlug.id !== data.id) {
            workspaceSlug = `${requestedSlug}-${data.id.slice(0, 8)}`;
        }

        const existingWorkspace = await prisma.workspace.findUnique({
            where: { id: data.id },
        });

        if (existingWorkspace) {
            await prisma.workspace.update({
                where: { id: data.id },
                data: {
                    name: data.name,
                    slug: workspaceSlug,
                    ownerId: data.created_by,
                    image_url: data.image_url,
                },
            });
        } else {
            await prisma.workspace.create({
                data: {
                    id: data.id,
                    name: data.name,
                    slug: workspaceSlug,
                    ownerId: data.created_by,
                    image_url: data.image_url,
                },
            });
        }

        //Add creator as ADMIN member if they are not already a member
        await prisma.workspaceMember.upsert({
            where: {
                userId_workspaceId: {
                    userId: data.created_by,
                    workspaceId: data.id,
                },
            },
            update: { role: "ADMIN" },
            create: {
                userId: data.created_by,
                workspaceId: data.id,
                role: "ADMIN",
            },
        });
    }
);

//Inngest function to update workspace  data to a databse
const syncWorkspaceUpdation = inngest.createFunction(
    { id: "sync-workspace-update", triggers: [{ event: "clerk/organization.updated" }] },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspace.update({
            where:{
                 id: data.id,
            },
            data: {
                name: data.name,
                slug: data.slug,
                image_url: data.image_url,
            },
        });
    }
)

//Inngest Function to delete workspace data to a database
const syncWorkspaceDeletion = inngest.createFunction(
    { id: "sync-workspace-delete", triggers: [{ event: "clerk/organization.delete" }] },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspace.delete({
        where:{
            id: data.id,
            }
        });
    }
)

//Inngest Funstion to save workspace member data to a database

const syncWorkspaceMemberCreation = inngest.createFunction(
    {  id: 'sync-workspace-member' ,
    triggers: [{ event: "clerk/organization.accepted" }] },
    async ({ event }) => {
        const { data } = event;
        await prisma.workspaceMember.create({
            data: {
                userId: data.user_id,
                workspaceId:data.organization_id,
                role: String(data.role_name).toUpperCase(),
            }
        })
    }
) 

// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation,
    syncWorkspaceCreation,
    syncWorkspaceUpdation,
    syncWorkspaceDeletion,
    syncWorkspaceMemberCreation
];