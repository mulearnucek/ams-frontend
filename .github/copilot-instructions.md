# Copilot Instructions for AMS Frontend

## Project Overview
This is the frontend for an Academic Management System (AMS) built with Next.js 16 (App Router). It serves teachers and students.
**CRITICAL:** This is a **pure frontend** application. It connects to a separate backend API.

## Architecture & Boundaries
- **Frontend Only:** DO NOT create API routes (`app/api/...`) inside Next.js.
- **Backend Integration:**
  - Use the external API for all data operations.
  - If a required API endpoint is missing from documentation, **STOP** and ask the user for the request/response format. Do not mock or workaround without approval.
- **Authentication:**
  - Implemented via `better-auth` client.
  - Reference: `lib/auth-client.ts`.
  - Use `authClient` for all auth-related operations (signin, signout, session).

## Tech Stack & Conventions
- **Framework:** Next.js 16 (App Router), React 19.
- **Language:** TypeScript.
- **Styling:**
  - **Tailwind CSS v4:** Use `@theme` and CSS variables in `app/globals.css`.
  - **Shadcn UI:** Use for all UI components.
    - Location: `components/ui/`.
    - Add components via CLI or strictly following Shadcn patterns.
  - **Icons:** `lucide-react`.
- **State/Forms:** `react-hook-form` with `zod` validation.

## Coding Standards
1.  **Styling:**
    - Use `app/globals.css` for all color/theme variables (OKLCH format).
    - Use `cn()` helper from `@/lib/utils` for conditional class merging.
    - Example: `className={cn("bg-background text-foreground", className)}`.
2.  **Components:**
    - Place reusable UI components in `components/ui`.
    - Place feature-specific components in `components/<feature>`.
    - Ensure all components are responsive (mobile-first).
3.  **Imports:**
    - Use path aliases defined in `tsconfig.json` / `components.json`:
      - `@/components` -> `components/`
      - `@/lib` -> `lib/`
      - `@/ui` -> `components/ui/`

## Critical Workflows
- **Dev Server:** `npm run dev`
- **Linting:** `npm run lint`
- **Adding UI Components:** Prefer using existing Shadcn components in `components/ui`. If a new one is needed, ensure it matches the project's `new-york` style and `neutral` base color.

## "What to do if..."
- **API is missing:** "I cannot implement this feature because the backend API endpoint is not documented. Please provide the API endpoint path, method, request body, and response format."
- **Auth is needed:** Use `import { authClient } from "@/lib/auth-client"`.
