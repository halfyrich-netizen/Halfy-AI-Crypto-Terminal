# Implementation Plan: Real Gemini AI Integration & Dedicated Strategy Modal

Integrate real Gemini AI (`gemini-3.8-flash`) into the AI Autotrade Bot for live autonomous trade evaluation, and convert Strategy & Settings into a dedicated high-fidelity overlay modal with distinct Pure AI autonomous rules and Hybrid user risk controls.

---

## 1. User Requirements & Architectural Decisions

1. **Dedicated Overlay Modal for Strategy & Settings:**
   - Currently, clicking *Strategy & Settings* renders the settings block far down beneath the positions tables, creating the impression that nothing happened.
   - Convert this into a dedicated, clean overlay modal (`fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4`).
   - Modal contains clear header, close button (`X`), section tabs, save/cancel actions, and esc/backdrop click to close.
   - **Pure AI Mode:** The modal clearly demonstrates that Gemini AI autonomously governs all rules, setup selections, and sizing parameters to ensure fair competition in the Battle Arena.
   - **Hybrid Mode:** The modal provides user-tunable risk controls (Risk Per Trade %, Max Concurrent Positions, Min R:R, Min AI Confidence, Margin Multiplier) combined with Gemini's signals.

2. **Real Gemini AI (`gemini-3.8-flash`) Autotrade Engine:**
   - In `server.ts`, create a dedicated batch endpoint `POST /api/bot/gemini-scan` powered by the official `@google/genai` TypeScript SDK using `gemini-3.8-flash`.
   - Provide real-time market context to Gemini: live Binance prices, 24h volume, RSI(14), EMA crossovers, on-chain whale reserve outflows, and 8h derivatives funding rates.
   - Gemini evaluates candidates and outputs structured JSON: selected asset, trade action (`Strong Long` / `Long`), dynamic Entry Zone, Take-Profit 1, Stop-Loss, Kelly confidence score, and clear reasoning thesis.
   - Connect frontend `scanCurrentBook` in `src/components/PortfolioView.tsx` to this real Gemini endpoint with instant fallback to quantitative mathematical engine to guarantee zero downtime.
   - Display real Gemini model badge (`● Powered by Gemini 3.8 Flash`) in the execution log and candidate audit modal.

---

## 2. Step-by-Step Execution Plan

### Step 1: Server-Side Gemini Autotrade Scan Endpoint
- **File:** `server.ts`
- **Action:** Add `POST /api/bot/gemini-scan`:
  - Receives market universe, current regime, book mode (`PURE_AI` vs `HYBRID`), and available liquidity.
  - Queries `gemini-3.8-flash` via `@google/genai` with structured JSON schema.
  - Parses real LLM responses with trade selection, targets, and rationale.
- **Verification:** Test endpoint returns valid JSON with 200 OK.

### Step 2: Client API Integration
- **File:** `src/services/api.ts`
- **Action:** Add `executeGeminiBotScan(candidates, mode, config)` method that communicates with `POST /api/bot/gemini-scan`.
- **Verification:** TypeScript compiles cleanly.

### Step 3: Transform Strategy & Settings into a Dedicated Overlay Modal
- **File:** `src/components/PortfolioView.tsx`
- **Action:**
  - Wrap the Strategy & Settings panel in a centered, responsive modal overlay with `z-50`, backdrop blur, and scrollable container.
  - Clicking the *Strategy & Settings* button immediately opens the modal in the viewport.
  - Pure AI shows clear read-only Autonomous Gemini Brain governance; Hybrid AI enables direct numeric inputs and presets.
  - Add explicit `[Close]` and `[Save Configuration]` buttons.
- **Verification:** Modal opens instantly on click and closes cleanly.

### Step 4: Wire Real Gemini Execution into AI Autotrade Bot
- **File:** `src/components/PortfolioView.tsx`
- **Action:**
  - Update `scanCurrentBook` to invoke `executeGeminiBotScan`.
  - When Gemini selects a trade, record the trade in `liveBookPositions` with Gemini's AI thesis, entry price, TP1, and SL.
  - Update Audit Report and execution feed to show Gemini's analysis.
- **Verification:** Clicking *Scan & Auto-Execute* runs Gemini AI analysis and reflects in bot positions.

### Step 5: Verification & Testing
- Run `npm test` (`vitest run src`) to ensure all 22 risk engine tests pass.
- Run `lint_applet` (`tsc --noEmit`) to verify 0 syntax or type errors.
- Run `compile_applet` (`vite build`) to verify clean production build.
