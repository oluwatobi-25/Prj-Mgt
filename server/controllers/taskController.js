import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

//create task
export const createTask = async (req, res) =>{
    try {
        const {userId} = await req.auth();
        const { projectId: projectIdParam } = req.params;
        const {projectId: projectIdBody, title, description, type, status, priority, assigneeId, due_date}
         = req.body

        const projectId = projectIdParam || projectIdBody;

        const origin = req.get('origin')

        //check if user has admin role for project
        const project = await prisma.project.findUnique({
            where: {id: projectId},
            include: {members: {include: {user: true}}}
        })

        if(!project){
            return res.status(404).json({message: "Project not found"});
        } else if(project.team_lead !== userId){
            return res.status(403).json({message: "You don't have admin privileges for this project"});
        } else if (assigneeId && !project.members.find((member)=>member.user.id === assigneeId)){
            return res.status(403).json({ message: "assignee is not a member of the project / workspace" })
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                priority,
                assigneeId,
                status,
                type,
                due_date: new Date(due_date)
            }
        })

        const taskWithAssignee = await prisma.task.findUnique({
            where: {id: task.id},
            include: {assignee: true}
        })

        await inngest.send({
            name: "app/task.assigned",
            data:{
                taskId:task.id,
                origin 
            }
        })

        res.json({
            task: taskWithAssignee, message: "Task Created successfully"
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message })   
    }
}

//Update task

export const updateTask = async(req, res) =>{
    try {
        const { projectId, taskId } = req.params;

        const task = await prisma.task.findUnique({
            where: {id: taskId}
        })

        if(!task){
            return res.status(404).json({message: "Task not found"})
        }

        const {userId} = await req.auth();
        const { title, description, type, status, priority, assigneeId, due_date } = req.body;

        //check if user has admin role for project
        const project = await prisma.project.findUnique({
            where: {id: projectId},
            include: {members: {include: {user: true}}}
        })

        if(!project){
            return res.status(404).json({message: "Project not found"});
        } else if(project.team_lead !== userId){
            return res.status(403).json({message: "You don't have admin privileges for this project"});
        }

        const updatedTask = await prisma.task.update({
            where: {id: taskId},
            data: {
                title,
                description,
                type,
                status,
                priority,
                assigneeId,
                due_date: due_date ? new Date(due_date) : undefined
            }
        })

        res.json({task: updatedTask, message: "Task Updated successfully"})

    } catch (error) {
        console.log(error)
        res.status(500).json({ message: error.code || error.message })
    }
}

//Delete Task

export const deleteTask = async(req, res) =>{
        try {
            const { projectId, taskId } = req.params;
            const {userId} = await req.auth()

            const task = await prisma.task.findUnique({
                where: {id: taskId}
            })

            if(!task){
                return res.status(404).json({message: "Task not found"})
            }

            const project = await prisma.project.findUnique({
                where: {id: projectId},
                include: {members: {include: {user: true}}}
            })

            if(!project){
                return res.status(404).json({message: "Project not found"});
            } else if(project.team_lead !== userId){
                return res.status(403).json({message: "You don't have admin privileges for this project"});
            }

            await prisma.task.delete({
                where: {id: taskId}
            })

            res.json({message: "Task deleted successfully"})

        } catch (error) {
            console.log(error)
            res.status(500).json({ message: error.code || error.message })
        }
}
