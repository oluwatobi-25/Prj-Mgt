import express from "express";
import { addMember, getUserWorkspaces, syncOrgMembership } from "../controllers/workspaceController.js";

const workspaceRouter = express.Router()

workspaceRouter.get('/', getUserWorkspaces)
workspaceRouter.post('/add-member', addMember)
workspaceRouter.post('/sync-org', syncOrgMembership)

export default workspaceRouter 