# NeuraWealth OS — Architecture & Best Practices Agreement

This document outlines the agreed-upon architectural standards, deployment strategies, and coding best practices for the NeuraWealth OS platform. It serves as a living contract between all contributors (human and AI) to ensure the platform remains secure, performant, and maintainable.

---

## 1. Deployment Strategy

NeuraWealth OS is a 24/7 automated financial platform. It requires a decoupled deployment architecture to ensure high availability, fast global content delivery, and persistent background processes.

### Frontend (PWA) — Vercel
- **Target:** Vercel Edge Network
- **Why:** Zero-configuration global CDN, native SPA routing support, automatic HTTPS, and fast cold starts.
- **Configuration:** The `vercel.json` file handles routing, directing `/api/*` requests to the backend service.

### Backend (API & Bot) — Railway
- **Target:** Railway.app (Paid Tier)
- **Why:** Provides a persistent Node.js process without cold starts, which is critical for receiving Telegram webhooks and executing scheduled trading logic.
- **Configuration:** Handles all Express routes, rate limiting, and external API proxying.

---

## 2. Security Standards

Security is paramount for a platform handling financial data and API keys.

### Environment Variables & Secrets
- **Never expose secrets to the client.** Variables prefixed with `VITE_` are embedded in the client bundle and are publicly visible.
- **API Keys:** The Telegram Bot Token (`TELEGRAM_BOT_TOKEN`), CoinGecko Pro Key, and any exchange API keys MUST live exclusively on the Railway backend.
- **Proxy Pattern:** The client MUST route sensitive requests through the backend (e.g., `/api/telegram/send`) rather than calling external APIs directly.

### HTTP Security Headers
- The backend MUST use `helmet` to enforce security headers.
- **Content Security Policy (CSP):** We aim to eliminate `'unsafe-inline'` for scripts. Future iterations will implement nonce-based or hash-based CSPs.
- **Rate Limiting:** Implement tiered rate limiting using `express-rate-limit`:
  - General API routes: 500 req / 15 min
  - Signal generation: 60 req / 15 min
  - Trading execution: 10 req / 15 min

---

## 3. CI/CD Pipeline Design

Our continuous integration pipeline ensures code quality and security before deployment.

- **Trigger:** Runs on all pushes to `main`, `master`, `feature/**`, `fix/**`, and `copilot/**`.
- **Jobs:**
  1. **Type-check:** `pnpm check` (TypeScript strict mode)
  2. **Format:** `pnpm format:check` (Prettier)
  3. **Test:** `pnpm test` (Vitest unit tests)
  4. **Build:** `pnpm build` (Production build)
  5. **Audit:** `pnpm audit --audit-level=high` (Dependency security)
- **CodeQL:** Runs weekly and on PRs to scan for security vulnerabilities using the `security-extended` query suite.

---

## 4. PWA Standards & iPhone Optimization

NeuraWealth OS is designed as a Progressive Web App (PWA) to bypass app store restrictions while providing a native-like experience.

- **Manifest:** Must include separate entries for `any` and `maskable` icon purposes.
- **iOS Support:** Apple ignores the manifest for icons and splash screens. We MUST include:
  - `<link rel="apple-touch-icon">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
  - `<link rel="apple-touch-startup-image">` for various iPhone dimensions to prevent the white flash on launch.
- **Service Worker:** Use a dynamic cache versioning strategy (e.g., injecting the build hash) and implement a "New version available" prompt to ensure users always have the latest trading logic.

---

## 5. Telegram Bot Architecture

The Telegram integration delivers push signals to users.

- **Webhook over Polling:** The bot MUST use webhooks (`/api/telegram/webhook`) rather than long-polling to reduce server load and ensure immediate signal delivery.
- **Message Queuing:** For broadcast signals to multiple users, the backend should implement a basic queue to avoid hitting Telegram's rate limits (30 messages per second).

---

## 6. Technical Analysis Engine Standards

The core value of NeuraWealth OS is its signal generation. The technical analysis engine must be robust.

- **Data Validation:** All functions (e.g., `calculateRSI`, `calculateMACD`) MUST validate input arrays. They must handle empty arrays, `NaN`, and `Infinity` gracefully without crashing or returning false signals.
- **Error Handling:** API failures from CoinGecko must be caught, logged, and presented to the user as a "Data Unavailable" state, rather than triggering erroneous trades.
- **Terminology:** The "AI Confidence" score is a weighted heuristic (Confluence Score). It should be documented as such to manage user expectations.

---

## 7. Revenue Tracking & Analytics

- **Analytics:** We use self-hosted Umami analytics. The tracking script MUST include `data-auto-track="true"`.
- **Privacy:** Analytics must respect user privacy and avoid tracking personally identifiable financial data.

---

## 8. Code Style & TypeScript Strictness

- **TypeScript:** `strict: true` is mandatory. No `any` types allowed in new code.
- **Formatting:** Prettier is the single source of truth for code formatting.
- **Component Library:** We use Radix UI primitives styled with Tailwind CSS (shadcn/ui pattern).

---

## 9. Testing Strategy

- **Unit Tests:** Critical financial logic (technical analysis, P&L calculations) MUST have comprehensive unit tests using Vitest.
- **Coverage:** Aim for 100% coverage on the `client/src/lib/technicalAnalysis.ts` module.

---

## 10. Monitoring & Alerting

For a 24/7 automated platform, silent failures are unacceptable.

- **Uptime:** Use a service like Better Stack to monitor the Railway backend endpoint.
- **Error Tracking:** Implement structured logging for all backend errors, particularly those related to external API rate limits or webhook delivery failures.

---

*Document maintained by the NeuraWealth OS Architecture Team.*
