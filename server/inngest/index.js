import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project management" });

//Inngest Function to save user data to a database
const syncUserCreation = inngest.createFunction(
    { id: "sync-user-creation", event: "clerk/user.created" },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.create({
            data: {
                id: data.id,
                name: data.first_name + " " + data.last_name,
                email: data.email_addresses[0].email_address,
                image: data.image_url,
            },
        });
    }
);

//Inngest Function to delete user data to a database
const syncUserDeletion = inngest.createFunction(
    { id: "sync-user-deletion", event: "clerk/user.deleted" },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.delete({
            where: {
                id: data.id,
            },
        });
    }
);

//Inngest Function to update user data to a database
const syncUserUpdate = inngest.createFunction(
    { id: "sync-user-update", event: "clerk/user.updated" },
    async ({ event }) => {
        const { data } = event;
        await prisma.user.update({
            where: {
                id: data.id,
            },
            data: {
                name: data.first_name + " " + data.last_name,
                email: data.email_addresses[0].email_address,
                image: data.image_url,
            },
        });
    }
);




// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdate
];