# SupplySense AI

> AI-powered inventory analytics for SME manufacturers. Upload your spreadsheet. Get board-ready insights in under 60 seconds.

---

## Overview

SupplySense AI transforms raw inventory spreadsheets into actionable intelligence. It auto-maps 50+ column naming variations, runs eight analytics modules, and delivers a printable executive brief — all client-side, with no data ever leaving the browser.

Built for operations managers, supply chain leads, and CFOs who need answers without a $50,000 ERP implementation.

---

## Features

| Module | Description |
|--------|-------------|
| **Inventory Health Score** | 0–100 composite score across dead stock %, slow mover %, stockout risk %, and A-item revenue concentration |
| **Dead Stock Detection** | Auto-flags SKUs with zero movement ≥365 days; shows capital locked, carry cost, and liquidation action per SKU |
| **Stockout Risk Scores** | Per-SKU risk score using days-of-stock vs lead time and demand variance |
| **ABC Analysis** | Full Pareto classification — A-items drive 70% of revenue |
| **EOQ Reorder Engine** | Economic Order Quantity + 95% service-level safety stock per SKU with urgency tiers |
| **AI Executive Brief** | Boardroom-ready narrative for CEO, Supply Chain, and Procurement audiences |
| **Inventory Turnover** | Turnover ratio vs industry benchmarks (Manufacturing, Wholesale, Retail, FMCG) |
| **Working Capital Report** | Capital locked in dead stock and slow movers with estimated cash recovery |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.7 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19 + Tailwind CSS v4 |
| Charts | Recharts 3 |
| Animations | Framer Motion 12 |
| Spreadsheet Parsing | SheetJS (xlsx) |
| Icons | Lucide React |
| Deployment | Vercel |

---

## Project Structure

```
supplysense-app/
├── app/                        # Next.js App Router pages
│   ├── api/analyze/            # Server-side file analysis API route
│   ├── dashboard/              # All dashboard pages
│   │   ├── abc-analysis/
│   │   ├── financial-impact/
│   │   ├── health-score/
│   │   ├── insights/
│   │   ├── kpi/[key]/
│   │   ├── preferences/
│   │   ├── reports/
│   │   ├── risk/
│   │   ├── risk-heatmap/
│   │   ├── turnover/
│   │   ├── validation/
│   │   └── layout.tsx          # Auth guard
│   ├── login/                  # Authentication page
│   ├── settings/               # Policy configuration
│   ├── upload/                 # File upload & analysis
│   ├── globals.css
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing page
├── components/
│   ├── dashboard/              # KPI cards, charts, sidebar, tables
│   ├── demo/                   # Demo mode banner
│   ├── landing/                # Hero, Features, Pricing, SocialProof
│   ├── upload/                 # DropZone, ValidationProgress
│   ├── validation/             # TrustBadge, ScoreBreakdown
│   ├── PlanGate.tsx            # Plan-based feature gating
│   └── ThemeSwitcher.tsx
├── lib/                        # Business logic & utilities
│   ├── auth.ts                 # Authentication helpers
│   ├── inventory-analyzer.ts   # Core analysis engine
│   ├── inventory-parser.ts     # XLSX/CSV parsing + multi-sheet merge
│   ├── insights-generator.ts   # AI executive brief generator
│   ├── html-report-generator.ts# Exportable HTML report
│   ├── demo-data.ts            # Built-in demo dataset
│   ├── types.ts                # TypeScript interfaces
│   └── utils.ts                # Shared utilities
├── public/                     # Static assets
│   └── sample-inventory-template.csv
├── next.config.ts
├── tsconfig.json
├── vercel.json
└── postcss.config.mjs
```

---

## Prerequisites

- Node.js 18 or higher
- npm 9 or higher

---

## Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/supplysense-ai.git
cd supplysense-ai

# Install dependencies
npm install
```

---

## Local Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Mode

Click **"Try Demo"** on the landing page — no login required. A pre-built dataset of 100 SKUs loads automatically and showcases all eight modules.

### Login (for file uploads)

| Username | Password | Plan |
|----------|----------|------|
| `tamkeen` | `matco123` | Growth |
| `abc` | `abc` | Starter |

> **Note:** Authentication is localStorage-based for this MVP. No backend or database is required.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Create optimised production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint checks |

---

## Build

```bash
npm run build
```

Expected output:
- 20 routes generated (18 static + 2 dynamic)
- 0 TypeScript errors
- 0 ESLint errors

---

## Environment Variables

None required. The application is fully client-side with no external API dependencies.

---

## Deployment on Vercel

### Option 1 — Vercel Dashboard (Recommended)

1. Push this repository to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repository
4. Leave all settings at defaults — Vercel auto-detects Next.js
5. Click **Deploy**

No environment variables need to be configured.

### Option 2 — Vercel CLI

```bash
npm i -g vercel
vercel deploy --prod
```

### Production Configuration

`vercel.json` is pre-configured with:
- Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Immutable cache headers for static assets (1-year TTL)
- API function timeout set to 10 seconds

---

## Plan Tiers

| Feature | Free | Starter ($10/mo) | Growth ($99/mo) |
|---------|------|-----------------|-----------------|
| Max SKUs | 500 | 5,000 | 50,000 |
| Uploads / month | 1 | 5 | Unlimited |
| Health Score | ✅ | ✅ | ✅ |
| ABC Analysis | ✅ | ✅ | ✅ |
| Risk Heatmap | ✅ | ✅ | ✅ |
| AI Insights | ❌ | ✅ | ✅ |
| Turnover Analysis | ❌ | ✅ | ✅ |
| Financial Impact | ❌ | ✅ | ✅ |

---

## Supported File Formats

- `.xlsx` — Excel workbook (single or multi-sheet — sheets with identical structure are merged automatically)
- `.xls` — Legacy Excel
- `.csv` — Comma-separated values
- `.tsv` — Tab-separated values

Maximum file size: **10 MB**

---

## Browser Compatibility

All modern browsers — Chrome, Edge, Firefox, Safari. File parsing runs entirely in the browser via WebAssembly (SheetJS).

---

## License

Private — All rights reserved © 2025 SupplySense AI
