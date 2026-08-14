# Meet Apps Backend

Backend API for a meeting and collaboration platform built with Node.js, Express, TypeScript, Prisma, PostgreSQL, Socket.IO, and LiveKit.

This project provides authentication, meeting management, waiting room controls, breakout rooms, polls, screen sharing, recording workflows, and LiveKit token/webhook integration.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for module boundaries, dependency rules, and the secure meeting admission lifecycle.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Core Features](#core-features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Project](#running-the-project)
- [Authentication](#authentication)
- [API Conventions](#api-conventions)
- [API Documentation](#api-documentation)
- [Socket.IO Events](#socketio-events)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)

## Overview

The API is organized by feature modules and exposes REST endpoints under the `/api/v1` prefix. It uses Prisma as the ORM, PostgreSQL as the primary database, JWT for authentication, and Socket.IO for real-time room communication.

Default local URLs:

- API base URL: `http://localhost:8000/api/v1`
- Health check: `http://localhost:8000/`

## Tech Stack

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- Socket.IO
- LiveKit Server SDK
- JWT Authentication
- Zod validation
- Jest

## Core Features

- User registration, login, refresh token, logout, password reset flow
- Meeting creation, update, join, leave, admission, moderation, and ending
- Waiting room management
- Breakout room creation, listing, joining, broadcast messaging, and bulk close
- Poll creation, voting, result retrieval, and close actions
- Screen share start, stop, approval, and denial flow
- Recording start, stop, download, and delete flow
- LiveKit access token issuing and webhook handling
- Real-time room join events with Socket.IO

## Project Structure

```text
src/
  app/
    config/
    errors/
    middlewares/
    modules/
      Auth/
      Breakout/
      LiveKit/
      Meetings/
      Polls/
      Record/
      ScreenShare/
    sockets/
  helpers/
  lib/
  shared/
prisma/
  schema.prisma
tests/
```

## Getting Started

### Prerequisites

- Node.js 20+ recommended
- npm 10+
- PostgreSQL 16+ recommended
- LiveKit credentials if you want real-time media features
- SMTP credentials if you want email-based password reset
- AWS S3 credentials if you want recording file storage features

### Installation

1. Clone the repository:

```bash
git clone <your-repository-url>
cd meet-apps-backend
```

2. Install dependencies:

```bash
npm install
```

3. Copy the example environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

4. Update `.env` with your local or cloud credentials.

5. Generate Prisma client:

```bash
npx prisma generate
```

6. Push the Prisma schema to the database:

```bash
npx prisma db push
```

7. Start the development server:

```bash
npm run dev
```

## Environment Variables

The project reads configuration from `.env`.

### Required for local development

| Variable | Description | Example |
| --- | --- | --- |
| `NODE_ENV` | Application environment | `development` |
| `PORT` | API server port | `8000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/meet_apps?schema=public` |
| `JWT_SECRET` | JWT access token secret | `replace_with_secure_secret` |
| `EXPIRE_IN` | Access token lifetime | `1d` |
| `REFRESH_TOKEN_SECRET` | Refresh token secret | `replace_with_another_secret` |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `RESET_PASS_TOKEN` | Reset password token secret | `reset_secret` |
| `RESET_PASS_TOKEN_EXPIRES_IN` | Reset token lifetime | `15m` |
| `RESET_PASS_URL` | Frontend reset password URL | `http://localhost:3000/reset-password` |
| `SALT_ROUND` | Bcrypt salt rounds | `10` |

### Optional but recommended

| Variable | Description |
| --- | --- |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `RATE_LIMIT_WINDOW_MS` | Rate limit time window |
| `RATE_LIMIT_MAX_REQUESTS` | Maximum requests per window |
| `EMAIL` | SMTP sender email |
| `APP_PASS` | SMTP app password |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |
| `LIVEKIT_URL` | LiveKit server URL |
| `LIVEKIT_TOKEN_TTL` | Room token lifetime, for example `15m` |
| `AWS_REGION` | S3 region |
| `AWS_ACCESS_KEY_ID` | S3 access key |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key |
| `AWS_BUCKET` | S3 bucket for recordings |
| `REDIS_HOST` | Redis host if token/session blocking is enabled |
| `REDIS_PORT` | Redis port |
| `REDIS_PASSWORD` | Redis password |

## Database Setup

### Option 1: Local PostgreSQL

1. Create a PostgreSQL database named `meet_apps`.
2. Update `DATABASE_URL` in `.env`.
3. Run:

```bash
npx prisma generate
npx prisma db push
```

### Option 2: Docker for PostgreSQL

If Docker is installed, you can use the included `docker-compose.yml` to run PostgreSQL:

```bash
docker compose up -d db
```

Then push the schema:

```bash
npx prisma db push
```

## Running the Project

### Development

```bash
npm run dev
```

### Production-style run

```bash
npm run build
npm start
```

### Health check

```bash
curl http://localhost:8000/
```

Expected response:

```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "ok",
    "uptime": 12.34
  }
}
```

## Authentication

Protected routes require authentication through one of these methods:

- `Authorization: Bearer <accessToken>`
- Cookie-based auth for `accessToken` if your client stores it there

Login and registration also set a `refreshToken` cookie.

### Auth flow

1. Register or log in.
2. Store the returned `accessToken`.
3. Send the token in the `Authorization` header for protected endpoints.
4. Use `/api/v1/auth/refresh-token` to obtain a new access token using the refresh token cookie.

## API Conventions

### Base path

All REST endpoints are prefixed with:

```text
/api/v1
```

### Success response shape

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

### Error response shape

```json
{
  "success": false,
  "message": "Validation failed",
  "errorSources": [
    {
      "path": "email",
      "message": "Invalid email"
    }
  ],
  "data": {
    "errors": [
      {
        "path": "email",
        "message": "Invalid email"
      }
    ]
  }
}
```

## API Documentation

### Health

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/` | No | Service health check |

### Auth

Base path: `/api/v1/auth`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/register` | No | Register a new user |
| `POST` | `/login` | No | Log in a user |
| `POST` | `/forgot-password` | No | Send reset password link |
| `POST` | `/reset-password` | No | Reset password |
| `POST` | `/refresh-token` | Refresh token cookie | Issue a new access token |
| `POST` | `/logout` | Refresh token cookie recommended | Log out user |

#### `POST /api/v1/auth/register`

Request body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "strongpassword"
}
```

#### `POST /api/v1/auth/login`

Request body:

```json
{
  "email": "john@example.com",
  "password": "strongpassword"
}
```

#### `POST /api/v1/auth/forgot-password`

Request body:

```json
{
  "email": "john@example.com"
}
```

#### `POST /api/v1/auth/reset-password`

Request body:

```json
{
  "token": "signed-reset-token-from-email",
  "newPassword": "newStrongPassword"
}
```

### Meetings

Base path: `/api/v1/meetings`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/create` | Yes | Create a meeting |
| `GET` | `/:code` | Yes | Get a meeting by join code |
| `PUT` | `/:code` | Yes | Update a meeting |
| `DELETE` | `/:code` | Yes | Delete a meeting |
| `POST` | `/join` | Yes | Join a meeting |
| `POST` | `/:code/leave` | Yes | Leave a meeting |
| `GET` | `/:code/waiting-room` | Yes | View waiting room participants |
| `POST` | `/:code/admit/:userId` | Yes | Admit one participant |
| `POST` | `/:code/admit-all` | Yes | Admit all waiting users |
| `POST` | `/:code/deny/:userId` | Yes | Deny one participant |
| `POST` | `/:code/kick/:userId` | Yes | Remove participant from meeting |
| `POST` | `/:code/end` | Yes | End the meeting |
| `POST` | `/:code/mute/:userId` | Yes | Mute one participant |
| `POST` | `/:code/mute-all` | Yes | Mute all participants |
| `POST` | `/:code/cohost/:userId` | Yes | Assign co-host role |
| `GET` | `/:code/participants` | Yes | Get meeting participants |

#### `POST /api/v1/meetings/create`

Request body:

```json
{
  "title": "Weekly Sync",
  "type": "instant",
  "max_participants": 100,
  "waiting_room_on": true,
  "allow_screenshare": true,
  "screenshare_needs_approval": false,
  "is_recorded": false,
  "scheduled_at": "2026-05-01T10:00:00.000Z"
}
```

#### `POST /api/v1/meetings/join`

Request body:

```json
{
  "joinCode": "ABCD1234"
}
```

#### `PUT /api/v1/meetings/:code`

Request body:

```json
{
  "title": "Updated Meeting Title",
  "max_participants": 150,
  "waiting_room_on": true,
  "allow_screenshare": true,
  "screenshare_needs_approval": true,
  "is_recorded": true,
  "scheduled_at": "2026-05-01T10:00:00.000Z"
}
```

### Breakout Rooms

Base path: `/api/v1/meetings/:code/breakout`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/` | Yes | Create breakout rooms |
| `GET` | `/` | Yes | List breakout rooms |
| `POST` | `/:roomId/join` | Yes | Join a breakout room |
| `POST` | `/end-all` | Yes | End all breakout rooms |
| `POST` | `/broadcast` | Yes | Broadcast a message to breakout rooms |

#### `POST /api/v1/meetings/:code/breakout`

Request body:

```json
{
  "rooms": [
    {
      "name": "Room A",
      "participantIds": [
        "uuid-1",
        "uuid-2"
      ]
    }
  ]
}
```

#### `POST /api/v1/meetings/:code/breakout/broadcast`

Request body:

```json
{
  "message": "Please return to the main room in 2 minutes."
}
```

### Polls

Base path: `/api/v1/meetings/:code/polls`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/` | Yes | Create a poll |
| `GET` | `/` | Yes | List meeting polls |
| `POST` | `/:pollId/vote` | Yes | Submit vote |
| `GET` | `/:pollId/results` | Yes | Get poll results |
| `POST` | `/:pollId/close` | Yes | Close poll |

#### `POST /api/v1/meetings/:code/polls`

Request body:

```json
{
  "question": "Which sprint goal should we prioritize?",
  "options": [
    "Performance",
    "Mobile UX",
    "Analytics"
  ]
}
```

#### `POST /api/v1/meetings/:code/polls/:pollId/vote`

Request body:

```json
{
  "optionId": "poll-option-uuid"
}
```

### Screen Share

Base path: `/api/v1/screen-share`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/:code/screenshare/status` | Yes | Get screen share status |
| `POST` | `/:code/screenshare/start` | Yes | Start screen sharing |
| `POST` | `/:code/screenshare/stop` | Yes | Stop screen sharing |
| `POST` | `/:code/screenshare/approve/:userId` | Yes | Approve a user screen share request |
| `POST` | `/:code/screenshare/deny/:userId` | Yes | Deny a user screen share request |

### Recordings

Base path: `/api/v1/recordings`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/:code/start` | Yes | Start recording for a meeting |
| `POST` | `/:code/stop` | Yes | Stop recording for a meeting |
| `GET` | `/:meetingId` | Yes | Get recordings for a meeting |
| `GET` | `/:recordingId/download` | Yes | Download a recording |
| `DELETE` | `/:recordingId` | Yes | Delete a recording |

### LiveKit

Base path: `/api/v1/livekit`

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/webhook` | No | Receive LiveKit webhooks |
| `POST` | `/token` | Yes | Issue a LiveKit token for a meeting |

#### `POST /api/v1/livekit/token`

Request body:

```json
{
  "joinCode": "ABCD1234"
}
```

## Socket.IO Events

The server uses JWT auth for Socket.IO connections. Pass the access token using either:

- `socket.auth.token`
- `Authorization: Bearer <token>` in the handshake headers

### Supported events

| Event | Payload | Description |
| --- | --- | --- |
| `meeting:join` | `meetingCode: string` | Join Socket.IO room `meeting:{meetingCode}` |
| `breakout:join` | `roomId: string` | Join Socket.IO room `breakout:{roomId}` |

Example client connection:

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:8000", {
  auth: {
    token: accessToken
  }
});

socket.emit("meeting:join", "ABCD1234", (response) => {
  console.log(response);
});
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run development server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server from `dist/server.js` |
| `npm test` | Run Jest tests |
| `npm run test:api` | Build and run API tests |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run Prisma development migration |
| `npm run prisma:studio` | Open Prisma Studio |

## Troubleshooting

### Prisma client errors

If Prisma types or client imports fail, run:

```bash
npx prisma generate
```

### Database connection issues

- Verify PostgreSQL is running
- Confirm `DATABASE_URL` is correct
- Confirm the target database exists
- Re-run `npx prisma db push`

### CORS issues

Set `CORS_ORIGINS` in `.env` with your frontend URLs:

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### LiveKit issues

Verify these values:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

## License

Add your preferred license information here.
