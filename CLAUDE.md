# Emma - Fantasy Football App

## Project Overview
Mobile fantasy football league app for iOS (App Store submission in progress). Users join leagues, make weekly player picks (QB, RB, FLEX), and compete on leaderboards.

## Tech Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind, shadcn-ui
- **Backend:** Supabase (Postgres, Auth, Edge Functions)
- **Mobile:** Capacitor 7.4 for iOS/Android
- **Push Notifications:** Firebase Cloud Messaging
- **State:** TanStack React Query, React Context

## Key Commands
```bash
npm run dev          # Local dev server
npm run build        # Production build
npx cap sync ios     # Sync to iOS
npx cap open ios     # Open Xcode
```

## Important Context

### Beta Tester Access
- Users who are members of the "2025 Regular Season Beta Test" league have access
- Non-beta users only see Playoffs (`season_type: 'POST'`)
- Access controlled in `src/pages/LeaguesHome.tsx` and `src/components/LeagueSwitcher.tsx`

### Season Types
- `REG` = Regular Season (Weeks 14-18) - beta only
- `POST` = Playoffs - default for all new leagues

### iOS App
- Bundle ID: `com.sirbenjamingold.emma`
- Safe area handling for notch devices
- Biometric auth infrastructure ready but opt-in flow not complete

## Pending Work
- [ ] Push notification navigation (tap to open picks page)
- [ ] Biometric login opt-in flow
- [ ] Deep-link invites (tap shared link → opens app)
- [ ] League settings editing (commissioner)
- [ ] Leave league flow

## Completed
- [x] Password reset flow
- [x] App Store URL in share text
- [x] Regular season hiding for non-beta users
- [x] League creation (atomic RPC function)

## Supabase
- Project dashboard: Check `supabase/` folder for edge functions
- Edge functions need manual deployment via Supabase CLI

## File Locations
- Pages: `src/pages/`
- Components: `src/components/`
- Hooks: `src/hooks/`
- Contexts: `src/contexts/`
- Supabase types: `src/integrations/supabase/`
