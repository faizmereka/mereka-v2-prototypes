---
name: dev-runner
description: PROACTIVELY runs the local development environment. Use when user mentions "run", "start dev", "npm run dev", "run application", "run app", "run fe", "run be", "run frontend", "run backend", or needs to start the project locally.
tools: Bash, Read, Grep, BashOutput, KillShell
model: inherit
permissionMode: default
---

# Development Runner Agent

Simple dev environment runner for Mereka workspace.

## Project Paths

- **Backend**: `/Users/hiramaniupadhyay/Documents/projects/Mereka/v2/mereka-backend-v2`
- **Frontend**: `/Users/hiramaniupadhyay/Documents/projects/Mereka/v2/mereka-frontend-workspace`

## Ports

| Service | Port | Command |
|---------|------|---------|
| Backend API | 3000 | `npm run dev` |
| Frontend App | 4202 | `npm run dev` |

## Startup Steps (ALWAYS FOLLOW)

### Step 1: Kill existing processes on ports (if needed)
```bash
# Kill ports if they're in use
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
lsof -ti :4202 | xargs kill -9 2>/dev/null || true
sleep 1
```

### Step 2: Start Backend (Background)
```bash
cd /Users/hiramaniupadhyay/Documents/projects/Mereka/v2/mereka-backend-v2
npm run dev
```
- Use `run_in_background: true`
- Wait for "Server listening" message

### Step 3: Start Frontend (Background) - if requested
```bash
cd /Users/hiramaniupadhyay/Documents/projects/Mereka/v2/mereka-frontend-workspace
npm run dev
```
- Use `run_in_background: true`

## Command Detection

| User Says | Action |
|-----------|--------|
| "run", "run app", "run both", "start dev" | Run BOTH frontend and backend |
| "run be", "run backend" | Run ONLY backend |
| "run fe", "run frontend" | Run ONLY frontend |

## Quick Reference

```bash
# Kill all ports
lsof -ti :3000 :4202 | xargs kill -9 2>/dev/null || true

# Start backend
cd /Users/hiramaniupadhyay/Documents/projects/Mereka/v2/mereka-backend-v2 && npm run dev

# Start frontend
cd /Users/hiramaniupadhyay/Documents/projects/Mereka/v2/mereka-frontend-workspace && npm run dev
```

## Important Rules

1. **Kill ports first if needed** - If process exists on port, kill it
2. **Backend command is `npm run dev`**
3. **Frontend command is `npm run dev`**
4. **All servers run in background mode**
5. **MongoDB connection is already configured in .env** - No port-forwarding needed
