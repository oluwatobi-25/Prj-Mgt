import express from "express";
import { addMember, createProject, updateProject } from "../controllers/projectController.js";
import { createTask, updateTask, deleteTask } from "../controllers/taskController.js";

const projectRouter = express.Router();

projectRouter.post('/', createProject)
projectRouter.put('/:projectId', updateProject)
projectRouter.patch('/:projectId', updateProject)
projectRouter.post('/:projectId/addMember', addMember)
projectRouter.post('/:projectId/tasks', createTask)
projectRouter.put('/:projectId/tasks/:taskId', updateTask)
projectRouter.delete('/:projectId/tasks/:taskId', deleteTask)

export default projectRouter
