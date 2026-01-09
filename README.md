# IKAG Marketplace

A service marketplace MVP where users can request informal services (gardening, plumbing, cleaning, etc.), providers manage their availability, and admins control service offerings.

## Features

- 🔐 **Authentication** - Email/password login with role-based access (admin, provider, user)
- 📍 **Location-based** - PostGIS-powered proximity search for nearby providers
- 📱 **PWA Support** - Installable app with offline capability via IndexedDB caching
- 🔔 **Real-time Updates** - Server-Sent Events (SSE) for live provider status
- 🎨 **Gold Theme** - Custom Mantine UI theme with gradient buttons

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: PostgreSQL 16 + PostGIS 3.4
- **ORM**: Drizzle ORM
- **UI**: Mantine 8
- **Auth**: better-auth
- **PWA**: Serwist
- **Container**: Podman Compose

## Prerequisites

- Node.js 20+
- Yarn
- Podman (or Docker)

## Getting Started

### 1. Install Dependencies

```bash
yarn install
```

### 2. Start the Database

```bash
podman compose up -d
```

This starts PostgreSQL with PostGIS extension on port 5432.

### 3. Run Migrations

```bash
yarn db:push
```

### 4. Seed Demo Data

```bash
yarn db:seed
```

### 5. Start Development Server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@ikag.test | Demo123! | Admin |
| plumber@ikag.test | Demo123! | Provider (verified) |
| gardener@ikag.test | Demo123! | Provider (verified) |
| cleaner@ikag.test | Demo123! | Provider (unverified) |
| user@ikag.test | Demo123! | User |
| jane@ikag.test | Demo123! | User |

## Available Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start development server |
| `yarn build` | Build for production |
| `yarn start` | Start production server |
| `yarn lint` | Run ESLint |
| `yarn db:push` | Push schema to database |
| `yarn db:seed` | Seed demo data |
| `yarn db:studio` | Open Drizzle Studio |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages (protected)
│   ├── login/             # Auth pages
│   └── register/
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...               # Feature components
├── db/                    # Database
│   ├── schema/           # Drizzle schema definitions
│   ├── migrations/       # SQL migrations
│   └── seed.ts           # Seed script
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and configs
│   ├── auth.ts           # better-auth server config
│   ├── auth-client.ts    # Auth client helpers
│   └── db/               # Database client
└── providers/            # React context providers
```

## Role Permissions

### User
- Browse available services and providers
- Create service requests
- View request history
- Rate completed services

### Provider
- Manage availability status
- Set service offerings and rates
- Accept/decline requests
- View earnings

### Admin
- Manage service types
- Verify providers
- View all users and requests

## Environment Variables

Create a `.env.local` file:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ikag

# Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
BETTER_AUTH_URL=http://localhost:3000

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deployment

### Build

```bash
yarn build
```

### Production

```bash
yarn start
```

For production deployment, ensure:
- PostgreSQL with PostGIS is available
- Environment variables are set
- HTTPS is configured for PWA features

## License

MIT
