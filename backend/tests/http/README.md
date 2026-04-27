# Hub Invitation API - HTTP Tests

Comprehensive HTTP test files for manual testing of the Hub Invitation System API.

## Files

1. **hubInvitation.http** - REST Client file (VS Code/IntelliJ compatible)
2. **curl-commands.sh** - Shell script with curl commands and interactive menu
3. **README.md** - This file

## Prerequisites

### Server Setup
```bash
# 1. Start MongoDB (if not already running)
# 2. Start the development server
npm run dev

# Server should be running on http://localhost:3000
```

### Authentication
You need a valid JWT token and Hub ID to test the APIs.

## Testing Options

### Option 1: Using hubInvitation.http (Recommended for VS Code)

1. Install REST Client Extension in VS Code
2. Update variables at top of file:
   - `@authToken`
   - `@hubId`
3. Click "Send Request" above any request

### Option 2: Using curl-commands.sh

1. Update variables in script:
   ```bash
   AUTH_TOKEN="your_token"
   HUB_ID="your_hub_id"
   ```

2. Run interactive menu:
   ```bash
   ./curl-commands.sh
   ```

3. Or run full test suite:
   ```bash
   ./curl-commands.sh suite
   ```

## API Endpoints

### Email Invitations
- POST `/hubs/:hubId/members/invite` - Create invitations
- POST `/invitations/:token/accept` - Accept invitation
- GET `/hubs/:hubId/invitations` - List pending invitations
- DELETE `/hubs/:hubId/invitations/:memberId` - Cancel invitation

### Invitation Links
- POST `/hubs/:hubId/invitation-links` - Create link
- POST `/invitation-links/:token/join` - Join via link
- GET `/hubs/:hubId/invitation-links` - List links
- DELETE `/hubs/:hubId/invitation-links/:linkId` - Disable link

### Member Management
- GET `/hubs/:hubId/members` - List members
- PATCH `/hubs/:hubId/members/:memberId` - Update role
- DELETE `/hubs/:hubId/members/:memberId` - Remove member

## Quick Start

1. Start server: `npm run dev`
2. Get auth token (login endpoint)
3. Create a hub (get hub ID)
4. Update variables in test files
5. Run tests!

See full documentation in this file for detailed usage.
