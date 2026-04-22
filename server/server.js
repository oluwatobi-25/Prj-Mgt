import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";

dotenv.config()

const app = express()
app.use(cors())
app.use(clerkMiddleware())

app.use(express.json())

// Inngest endpoint
app.use("/api/inngest", serve({ client: inngest, functions }));


app.get('/', (req, res) => {
    res.send('Project Management API is running')
})

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`)
    })
}

export default app;