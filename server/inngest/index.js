import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";

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

//Inngest Function to send Email to Task Assignment
const sendTaskAssignmentEmail = inngest.createFunction(
    { id: "send-task-assignment-email",
    triggers: [{ event: "app/task.assigned" }] 
    },
    async ({ event, step }) => {
        const { taskId, origin } = event.data;

        const task = await prisma.task.findUnique({
            where: {
                id: taskId,
            },
            include: {
                assignee:true, 
                project:true,
            }
        });

        await sendEmail({
            to: task.assignee.email,
            subject: `New Task Assignment in ${task.project.name}`,
            body: `  
                <div style="max-width: 600px;">
                    <h2>Hi ${task.assignee.name}, 👋</h2>

                    <p style="font-size: 16px;">You've been assigned a new task:</p>
                    <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">${task.title}</p>

                    <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
                        <p style="margin: 6px 0;"><strong>Description:</strong> ${task.description}</p>
                        <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
                    </div>

                    <a href="${origin}" style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">
                        View Task
                    </a>

                    <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
                        Please make sure to review and complete it before the due date.
                    </p>
                </div>
            `,
        });

        if(new Date(task.due_date).toLocaleDateString() !== new Date().toDateString()){
            await step.sleepUntil("wait-for-due-date", new Date(task.due_date) )

            await step.run("check-if-task-is-completed", async () => {
               const task = await prisma.task.findUnique({
                where:{
                    id:taskId,
                },
                include: {
                    assignee: true,
                    project: true
                }
               })

               if (!task) return;

               if (task.status !== "DONE"){
                await step.run('send-task-reminder-mail', async () => {
                    await sendEmail({
                        to: task.assignee.email,
                        subject: `Reminder for ${task.project.name}`,
                        body: `  
                            <div style="max-width: 600px;">
                                <h2>Hi ${task.assignee.name}, 👋</h2>

                                <p style="font-size: 16px;">This is a friendly reminder that the following task is due today:</p>
                                <p style="font-size: 18px; font-weight: bold; color: #dc3545; margin: 8px 0;">${task.title}</p>

                                <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
                                    <p style="margin: 6px 0;"><strong>Description:</strong> ${task.description}</p>
                                    <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
                                </div>

                                <a href="${origin}" style="background-color: #28a745; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">
                                    View Task
                                </a>

                                <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
                                    Please complete it at your earliest convenience.
                                </p>
                            </div>
                        `,
                    })
                })
               }
               
            }   )
        }
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
    syncWorkspaceMemberCreation, 
    sendTaskAssignmentEmail
];