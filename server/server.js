import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import workspaceRouter from './routes/workspaceRoute.js';
import { protect } from './middlewares/authMiddleware.js';
import projectRouter from './routes/projectRoutes.js';
import taskRouter from './routes/taskRoutes.js';
import commentRouter from './routes/commentRoutes.js';

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

// Inngest endpoint (Must be before authentication middleware)
app.use("/api/inngest", serve({ client: inngest, functions }));

app.use(clerkMiddleware())

app.get('/', (req, res) => {
    res.send('Project Management API is running')
})

//Routes
app.use("/api/workspaces", protect, workspaceRouter)
app.use("/api/projects", protect, projectRouter)
app.use("/api/tasks", protect, taskRouter)
app.use("/api/comments", protect, commentRouter)

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`)
    })
}

export default app;
