## Project overview
This is NeuraWealth OS, a cross-platform mobile AI app and Telegram bot built with React Native (Expo SDK 55), Supabase for backend services, and LangGraph.js for AI agent orchestration. The app provides autonomous conversational AI features, real-time market data sync, and automated trading execution with a focus on defensive architecture and structural alignment.

## Tech stack
### Mobile & Web
- Expo SDK 55 with React Native 0.83
- Expo Router v4 for file-based navigation
- TypeScript with strict mode enabled
- Zustand for client state management
- TanStack React Query for server state
- NativeWind for styling (Dark Quant aesthetic: near-black, emerald green, electric cyan)

### Backend & AI
- Supabase (Auth, Database, Edge Functions, Realtime)
- @supabase/supabase-js with expo-sqlite/localStorage for session persistence
- Supabase Edge Functions (Deno) for AI agent execution
- LangGraph.js for stateful agent orchestration and autonomous execution
- Vercel AI SDK (@ai-sdk/react) for streaming chat UI

### Testing & Security
- Jest + React Native Testing Library for unit tests
- Maestro for E2E tests
- Frontier-level defensive protocols for API key management and execution validation

## Coding conventions
- Use functional components with hooks exclusively.
- Use the "function" keyword for pure functions.
- Use interfaces over type aliases; never use enum (prefer const objects).
- Use named exports for all components and hooks.
- Prefix boolean variables with is/has/can: isLoading, hasError, canSubmit.
- Structure files: types → exported component → subcomponents → helpers → static content.
- Extract functions longer than 20 lines into smaller named functions.
- All Supabase queries go through custom hooks in src/hooks/.
- Prefix environment variables with EXPO_PUBLIC_.
- Set detectSessionInUrl to false for all Supabase client configs.
- Never expose API keys client-side; all LLM calls and trade executions go through Edge Functions.
- Prioritize defensive coding: validate all inputs, handle edge cases gracefully, and ensure structural alignment with user risk parameters.

## Project structure
- src/app/ → Expo Router pages (file-based routing)
- src/components/ → Reusable UI components (Dark Quant themed)
- src/screens/ → Screen-specific component trees
- src/hooks/ → Custom hooks (useAuth, useAgentChat, useRealtimeSubscription)
- src/lib/ → Library configs (supabase.ts, langchain.ts)
- src/stores/ → Zustand stores
- src/providers/ → Context providers (AuthProvider, QueryProvider)
- src/types/ → Shared TypeScript interfaces
- src/utils/ → Pure utility functions
- supabase/migrations/ → Database migrations (YYYYMMDDHHmmss_description.sql)
- supabase/functions/ → Deno Edge Functions for AI agents and trade execution
- bot/ → Telegram bot specific logic and handlers

## Development commands
- Start: npx expo start
- Test: npx jest --watchAll
- Lint: npx eslint . --fix
- Generate types: supabase gen types typescript --local > src/types/database.ts
- New migration: supabase migration new <name>
- Deploy functions: supabase functions deploy <name>
