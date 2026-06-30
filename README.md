# 🇮🇳 Vikash Path (विकास पथ) — AI-Powered Hyperlocal Progress Tracker

Vikash Path is a comprehensive, dynamic, and mobile-responsive civic engagement platform tailored for hyperlocal progress tracking and community resolution loops. Built using Next.js 16, Tailwind CSS v4, Prisma, and the `z-ai-web-dev-sdk`, the application unites local citizens and municipal authorities under a unified digital space with the help of five specialized AI agents.

---

## 🌟 Concept & Vision

In many municipalities, civic complaints (potholes, garbage piles, broken streetlights) remain unresolved due to poor estimation of repair costs, lack of real-time communication, and disjointed reporting. 

**Vikash Path** bridges this gap:
- **For Citizens**: Provides seamless multi-lingual reporting (with voice translations), community voting, real-time feedback notifications, and a gamified rewards system (Swachh Coins & Badges).
- **For Municipal Authorities**: Provides an automated, prioritised workflow utilizing AI to group close-proximity complaints, auto-draft budget estimates, and manage resolutions.

---

## 🤖 The 5 AI Agents

Vikash Path integrates five advanced AI agents using the `z-ai-web-dev-sdk`:

1. **AI Live Inspector (VLM)** (`/api/ai/live-analysis`): Automatically detects the category and severity of a civic issue from an uploaded photo, filling out the complaint form automatically. Uses the `glm-4v-plus` model.
2. **Bhasha Translator (ASR + LLM)** (`/api/ai/bhasha-translate`): Allows citizens to record descriptions in regional Indian languages (e.g., Hindi, Bhojpuri, Maithili) and automatically translates them into structured transcripts.
3. **Hyperlocal Semantic Clustering (LLM + Spatial)** (`/api/ai/cluster`): Groups pending/voting complaints within 50 meters of each other that share a category into a single named cluster with an AI-generated summary to avoid duplicate operations.
4. **AI Budget Estimator (LLM)** (`/api/ai/budget-estimate`): Generates full engineering drafts, cost estimations in INR, materials lists, timeline assessments, and risk reviews for officials.
5. **Jan Samvaad Voice Alerts (TTS)** (`/api/tts` & `/api/ai/jan-samvaad`): Translates resolution notifications into custom audio announcements (using Hinglish/regional dialects) with TTS playback for real-time announcements.

---

## 🛠️ Technical Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide Icons, Framer Motion, Radix UI (Shadcn components), Zustand (State Management), React Query.
- **Backend API**: Next.js App Router API Route Handlers.
- **Database**: SQLite Database accessed via Prisma ORM.
- **AI Integrations**: `z-ai-web-dev-sdk` (for LLM, VLM, ASR, and TTS capabilities).
- **Real-Time Layer**: Socket.io server running as a mini-service (Jan Samvaad service on port `3003`).

---

## 📂 Project Structure

```
vikash-path/
├── .zscripts/                 # Bash scripts for building, running dev server, and mini-services
├── db/                        # Local database directory
├── download/                  # Static download resources
├── mini-services/             
│   └── jan-samvaad-service/   # Socket.io notification service (Port 3003)
├── prisma/
│   ├── schema.prisma          # Database models (User, Complaint, Cluster, Vote, etc.)
│   └── seed.ts                # Pre-populated demo data
├── public/                    # Static assets & sample images
├── src/
│   ├── app/                   # Next.js App Router (Pages, Auth, API Routes)
│   │   ├── api/               # API route endpoints
│   │   └── page.tsx           # Application entrypoint
│   ├── components/            # React UI components
│   │   ├── providers.tsx      # React Query Provider
│   │   └── vikash/            # Core dashboard/portal components
│   │       ├── header.tsx     # Tricolor Navbar
│   │       ├── landing.tsx    # Role Selection & Auth
│   │       ├── citizen-portal.tsx
│   │       └── municipal-dashboard.tsx
│   └── lib/                   # Utility helpers (AI clients, API clients, cookies session)
├── package.json               # Main package dependencies & run scripts
└── tailwind.config.ts         # Tailwind configuration
```

---

## 💾 Database Schema

The database uses SQLite with the following Prisma models:
- **User**: Represents Citizens and Municipal Officials. Includes roles, verification status, and game metrics (`swachhCoins`).
- **Complaint**: Civic issues reported by users. Features image URLs, audio transcripts, priority scores, and statuses (`PENDING`, `CLUSTERED`, `VOTING`, `IN_PROGRESS`, `RESOLVED`).
- **Cluster**: Groupings of nearby complaints (50m radius) of the same category.
- **Vote**: User votes on complaints. Upvoting adds `+2 Swachh Coins` to the voter.
- **BudgetEstimate**: LLM engineering estimates containing materials lists, cost ranges, and risk levels.
- **Resolution**: Municipal proof images and notes confirming that a complaint has been resolved.
- **Badge**: Reward badges earned by citizens (`SWACHHTA_YODHA`, `GRAM_VEER`, `COMMUNITY_LEADER`, `FIRST_REPORT`).
- **Notification**: Alerts linked to users, triggered on status changes (e.g., resolutions).

---

## ⚙️ Setup & Local Execution

### 1. Prerequisites
Ensure you have **Bun** installed globally on your machine.

### 2. Environment Configuration
Create or configure the `.env` file in the root directory:
```env
DATABASE_URL="file:./db/dev.db"
# If using the z-ai-web-dev-sdk, configure the required AI credentials as specified in your environment
```

### 3. Installation & Run
You can start both the Next.js development server and the Jan Samvaad Socket.io service in one command:

```bash
# Give execution permission to scripts (if on Unix)
chmod +x .zscripts/*.sh

# Run the unified development script
./.zscripts/dev.sh
```

Alternatively, run them manually:
```bash
# Install main dependencies
bun install

# Generate Prisma Client & Push Database Schema
bun run db:push

# Run database seed to populate mock users and complaints
bun prisma/seed.ts

# Start the Next.js application (runs on localhost:3000)
bun run dev
```

To run the Jan Samvaad service independently:
```bash
cd mini-services/jan-samvaad-service
bun install
bun run dev # runs on localhost:3003
```

---

## 🔌 API Routes Reference

### 🔐 Authentication
* `POST /api/auth/citizen` - Authenticates citizen via simulated phone OTP.
* `POST /api/auth/municipal` - Authenticates officials (strict checks: must be a `.gov.in` domain and match a pre-registered employee ID).
* `GET /api/auth/me` - Gets details of the currently logged-in user.
* `POST /api/auth/logout` - Destroys the cookie-based session.

### 📋 Complaints & Actions
* `GET /api/complaints` - Query complaints with filters (`status`, `category`, `ward`).
* `POST /api/complaints` - Report a new complaint. Automatically awards the `FIRST_REPORT` badge on the user's first report.
* `GET /api/complaints/[id]` - Retrieve detailed info about a specific complaint, including votes, AI budget estimates, and resolutions.
* `POST /api/complaints/[id]/vote` - Citizen toggle vote (+2 Swachh Coins on upvote).
* `POST /api/complaints/[id]/resolve` - Municipal resolve complaint (requires proof image and note). Triggers WebSocket notification broadcasts to all voters.

### 🤖 AI Utilities
* `POST /api/ai/live-analysis` - Image analysis via VLM to autofill report category and severity.
* `POST /api/ai/bhasha-translate` - Audio file translation and transcription from local languages.
* `POST /api/ai/cluster` - Triggers semantic clustering for nearby unclustered complaints.
* `POST /api/ai/budget-estimate` - Municipal-only action to generate a detailed budget draft.
* `POST /api/tts` - High-fidelity Text-To-Speech WAV byte stream generator.
* `POST /api/ai/jan-samvaad` - Generates localized Hinglish announcements for resolved complaints.

---

## 🎨 Theme & Visual Guidelines

Vikash Path utilizes a custom-designed theme inspired by the **Indian National Flag**:
- **Saffron Primary** (`#FF9933` inspired): Used for main buttons, highlights, and primary actions representing courage and strength.
- **India Green Accent** (`#138808` inspired): Used for success states, resolutions, and rewards representing growth and auspiciousness.
- **Ashoka Chakra Blue / Gold**: Subtle accents used on hover states and verification badges.
- **AI Glow Utility**: Radial gradient glows applied to AI-powered inputs to indicate active agent support.
