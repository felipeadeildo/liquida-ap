# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Liquida AP is an online auction platform for liquidating items from AP 72, targeting Insper students but open to all. Features real-time bidding, scheduled auctions, payment tracking, and gamification elements.

## Tech Stack

- **Frontend**: React 19 + React Router v7 (SPA mode)
- **Backend**: Supabase (PostgreSQL + Realtime + Auth + Storage)
- **Styling**: TailwindCSS v4 + shadcn/ui (New York variant)
- **Type Safety**: TypeScript (strict mode)
- **Build**: Vite
- **MCP Integration**: Supabase MCP configured (`.mcp.json`)

## Commands

```bash
bun run dev              # Start development server
bun run build            # Build for production
bun start                # Serve production build
bun run typecheck        # Type checking + generate route types
```

## Database Schema (Supabase)

### Core Tables

**users**
- `id` (uuid, PK)
- `email` (string, unique, required)
- `whatsapp` (string, required)
- `name` (string, required)
- `photo` (string, url, optional)
- `is_insper` (boolean, default false)
- `course` (string, optional)
- `semester` (string, optional)
- `created_at` (timestamp)

**items**
- `id` (uuid, PK)
- `tittle` (string, required)
- `description` (text, required)
- `photos` (array of urls, required)
- `starting_big` (decimal, default 0)
- `bid_step` (decimal, required - e.g., 0.10, 1.00, 5.00)
- `is_donate` (boolean, default false)
- `status` (enum: 'rascunho', 'agendado', 'ativo', 'encerrado')
- `auction_start` (timestamp, nullable)
- `auction_end` (timestamp, nullable)
- `created_at` (timestamp)

**bids** (bids)
- `id` (uuid, PK)
- `item_id` (FK → items)
- `user_id` (FK → users)
- `value` (decimal, required)
- `is_deleted` (boolean, default false) - soft delete
- `created_at` (timestamp)

**finishes** (won items)
- `item_id` (FK → items)
- `user_id` (FK → users - winner)
- `final_value` (decimal)
- `payment_status` (enum: 'pendente', 'pago', 'entregue')
- `proof_url` (string, optional)
- `finished_at` (timestamp)

## Architecture

### Application Structure

```
app/
├── routes/              # Route components
│   ├── home.tsx        # Landing/auction grid
│   ├── admin/          # Admin dashboard & management
│   ├── item.$id.tsx    # Item detail with real-time bidding
│   ├── profile.tsx     # User profile & won items
│   └── auth/           # Login/signup flows
├── components/
│   ├── ui/             # shadcn/ui components
│   ├── auction/        # Auction-specific components (bid-card, countdown-timer, etc)
│   └── admin/          # Admin-only components
├── lib/
│   ├── supabase.ts     # Supabase client setup
│   ├── auth.tsx        # Auth context/hooks
│   └── utils.ts        # Utilities (cn, formatters, etc)
├── hooks/              # Custom hooks (useRealtime, useBidding, etc)
└── types/              # Shared TypeScript types
```

### Key Patterns

**Path Aliases**: `~/` maps to `app/`
- Example: `~/lib/supabase` → `app/lib/supabase.ts`

**Route Types**: Use generated types from `./+types/[route-name]`

**Supabase Client**: Create singleton in `app/lib/supabase.ts` with browser client

**Real-time**: Use Supabase Realtime subscriptions for:
- Live bid updates per item
- Online presence (viewers per item)
- Global activity feed
- Notifications when outbid

## Business Rules

### Bidding Logic
- New bid must be >= `(current_bid + step_lance)`
- Users cannot bid on their own items (if seller role added)
- Rate limiting: max X bids per minute
- Can only bid on items with `status = 'ativo'`
- Can only bid within `auction_start` and `auction_end` range
- Soft delete: deleted bids don't count as current bid but remain in history

### Item Lifecycle
1. **draft**: Being created by admin
2. **scheduled**: Scheduled with future `auction_start`
3. **active**: `auction_start <= now() <= auction_end`
4. **finished**: Past `auction_end` or manually closed

Auto-transition to `finished` via trigger/function when `auction_end` passes, creating `finishes` record with highest valid bid.

### Security (RLS)
- Users can only update their own profile
- Only admins can create/update/delete items
- All users can read active items
- Users can only create bids (not update/delete directly - use soft delete flag)
- Only item winner can see payment instructions

## Feature Domains

### User Features
- Auth: Supabase Auth with email/WhatsApp/name required, Insper fields optional
- Browse items: grid/list with filters (all, donations, status, price range)
- Item details: photo carousel, description, current bid, bid history, countdown
- Place bids with real-time updates
- Watchlist for favorite items
- Profile page: active bids, won items, payment status
- Payment flow: PIX instructions, upload receipt, track delivery

### Admin Features
- Item CRUD with multi-photo upload (Supabase Storage)
- Schedule auction start/end times
- Manually pause/extend/close items
- Dashboard: total raised, most disputed item, most active user, bid timeline chart
- Payment management: mark as paid/delivered
- Export final report (CSV/PDF)

### Gamification (MVP Extra)
- Confetti animation on winning
- Card pulse on new bid
- Emoji reactions on bids
- Profile badges for Insper students
- "Course war": total raised per course
- Dramatic countdown in last 30s
- Share to WhatsApp with preview

## MVP vs Extras

### MVP (Essential)
- ✅ Auth + complete registration
- ✅ Item CRUD with photos
- ✅ Bidding system with validation
- ✅ Real-time updates
- ✅ Scheduled auctions
- ✅ Basic admin dashboard
- ✅ PIX payment instructions
- ✅ Bid history

### Extras (Nice to have)
- 🎯 Watchlist
- 🎯 Push notifications
- 🎯 Rankings & gamification
- 🎯 Advanced charts
- 🎯 Emoji reactions
- 🎯 Auto-bid with limit
- 🎯 Receipt upload
- 🎯 Global activity feed

## Development Guidelines

### Working with Supabase
- Use MCP tools (`mcp__supabase__*`) for database operations
- Create migrations with `mcp__supabase__apply_migration` for DDL
- Use `mcp__supabase__execute_sql` for queries
- Check advisors regularly with `mcp__supabase__get_advisors` (security & performance)
- Generate TypeScript types with `mcp__supabase__generate_typescript_types`

### Real-time Implementation
- Subscribe to table changes: `supabase.channel().on('postgres_changes', ...)`
- Implement presence for viewer counts
- Use optimistic updates for better UX
- Handle connection drops gracefully

### Image Handling
- Upload to Supabase Storage (`public` bucket for item photos)
- Store URLs in `photos` array
- Support multiple image formats (JPG, PNG, WebP)

### Authentication Flow
- Supabase Auth handles sessions
- Store additional user data in `users` table via trigger on auth.users insert
- Use RLS to protect routes and data
- Implement auth context/provider in `app/lib/auth.tsx`

### Performance
- Use React Query for caching Supabase queries
- Implement pagination for item lists
- Lazy load images
- Debounce bid inputs
- Use database indexes on foreign keys and frequently queried fields

## User Flows

### Bidding Flow
1. User browses items → 2. Views item details → 3. Waits for auction start (countdown) → 4. Places bid (validates against current + step) → 5. Receives real-time updates → 6. Gets notified if outbid → 7. Wins auction → 8. Sees payment instructions → 9. Pays via PIX → 10. Sends receipt on WhatsApp → 11. Admin confirms → 12. Arranges pickup → 13. Item marked as delivered

### Admin Flow
1. Creates item with photos/details → 2. Schedules auction times → 3. Monitors real-time dashboard → 4. Manually closes if needed → 5. Receives win notification → 6. Gets PIX + receipt on WhatsApp → 7. Marks as paid → 8. Delivers item → 9. Marks as delivered → 10. Exports final report

## Notes

- All development in English
- Default dark mode (set in `app/root.tsx`)
- Mobile-first responsive design
- Accessibility: keyboard navigation, ARIA labels
- Error boundaries for graceful failures
- Loading states for async operations
- When creating components, use filenames as this-one-here.tsx (despite the compoenent name being ThisOneHere)
- When creating pages, use filenames as this-one-here.tsx (despite the page name being ThisOneHere)
- Prefer using supabase queryies instead of Supabase functions, we will protect our database with the use of RLS
- We use bun as our package manager
- When needed a new compoentns, just add by executing bunx shadcn@latest add [component-name]