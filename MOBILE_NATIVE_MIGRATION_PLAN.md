# Mobile Native Migration Plan (React Native)
## OneCampus → iOS + Android

**Prepared:** 2026-07-27  
**Scope:** Full app rewrite, web backend reuse

---

## 📊 Current Web Application Scope

### Quantified Inventory
- **44 Feature Modules** (attendance, assignments, exams, messages, notices, calendar, timetable, dashboard, profile, discipline, broadcast, leave, library, exams, etc.)
- **313 React Component Files**
- **44 Shared UI Components** (DataTable, Card, FlatList, UserSearchSelect, Badge, Avatar, Modal, etc.)
- **~28,000 lines of JSX/TS** (estimated across all features)
- **API Endpoints:** ~120+ REST routes
- **Database:** PostgreSQL with 50+ tables

### Core Features by Complexity

**Tier 1 (High Complexity - 35% of effort)**
- Attendance marking with roster/exception model
- Exam management with result publishing
- Timetable with real-time schedule management
- Calendar with events, holidays, exam dates
- Messages with threading & real-time Socket.io
- Class channels with chat, posts, file sharing
- Discipline tracking with incident logging

**Tier 2 (Medium Complexity - 45% of effort)**
- Dashboard (multiple role-based views)
- Student/Guardian/Staff profiles
- Leave request workflow
- Assignment submission & grading
- Notice publication & targeting
- Library (PDF viewer, document management)
- Evaluation & scoresheet
- Cohort & user management

**Tier 3 (Low Complexity - 20% of effort)**
- Simple CRUD screens (learners, instructors, guardians)
- ID card generation
- Bulk upload
- App settings/more menu
- Basic forms

---

## ⏱️ Effort Estimation

### Development Time by Phase

#### **Phase 1: Foundation & Infrastructure (8-10 weeks)**

| Task | Effort | Notes |
|---|---|---|
| React Native project setup | 1 week | Expo or bare React Native, navigation (React Navigation) |
| Firebase/FCM integration (native) | 1 week | Push notifications for iOS/Android |
| State management (Redux/Zustand) | 1 week | Replace React Query with offline-capable store |
| Authentication flow | 1 week | JWT + refresh token, secure storage (Keychain/Keystore) |
| Offline sync + SQLite | 1.5 weeks | Local DB, background sync, conflict resolution |
| Native UI component library | 2 weeks | Buttons, inputs, cards, modals, sheets matching web design |
| Navigation structure (tab bar, stack) | 1 week | Bottom tabs + nested stacks (mirrors web layout) |
| **Phase 1 Total** | **8-10 weeks** | Bare minimum to start feature development |

#### **Phase 2: Core Features (16-20 weeks)**

| Feature | Complexity | Weeks | Notes |
|---|---|---|---|
| **Authentication & Profile** | Medium | 1.5 | Login, register, profile edit, picture upload |
| **Dashboard** | Medium | 2 | Role-based views (learner/teacher/staff/admin), cards, insights |
| **Attendance** | **High** | 3.5 | Roster, exception marking, search, date picker, confirm dialog |
| **Timetable** | High | 2.5 | Schedule view, period detail, teacher info, optimization |
| **Calendar** | High | 2.5 | Month/week views, holidays, exams, events, event creation |
| **Assignments** | Medium | 2.5 | List, detail, submission, file upload, grading view |
| **Exams** | Medium | 2.5 | Schedule, results, scoresheet, performance charts |
| **Messages** | High | 3 | Conversation list, threading, file share, real-time (Socket.io) |
| **Class Channels** | High | 3 | Chat, posts, file library, @mentions, image gallery |
| **Notices** | Medium | 1.5 | List, detail, push notification, archive |
| **Leave Requests** | Medium | 1.5 | Form, status tracking, approval view (for staff) |
| **Student/Guardian Profile** | Medium | 2 | Info edit, documents, emergency contacts, linked users |
| **Library** | Medium | 1.5 | PDF viewer, document browser, download |
| **Discipline** | Low | 1.5 | Incident list, detail, timeline, warning levels |
| **More Menu / Settings** | Low | 1 | Settings, logout, app info, theme toggle |
| **Phase 2 Total** | — | **16-20 weeks** | Covers 90% of feature parity |

#### **Phase 3: Polish & Platform-Specific (6-8 weeks)**

| Task | Weeks | Notes |
|---|---|---|
| Native gestures & animations | 1.5 | Swipe gestures, transitions, haptic feedback |
| iOS-specific polish | 1.5 | Safe area handling, native modal appearance, Face ID integration |
| Android-specific polish | 1.5 | Material Design compliance, system back button, permissions |
| Performance optimization | 1 | FlatList virtualization, image caching, bundle size reduction |
| Accessibility (a11y) | 1 | Screen reader testing, contrast, touch targets |
| Testing (unit + E2E) | 1 | Critical paths only (not 100% coverage initially) |
| App store submission | 1 | Build signing, provisioning, app store review prep |
| **Phase 3 Total** | **6-8 weeks** | |

#### **Phase 4: QA, Bug Fixes & Launch (4-6 weeks)**

| Task | Weeks | Notes |
|---|---|---|
| Internal QA & bug fixes | 2 | Regression testing, edge cases, device testing (multiple sizes) |
| User acceptance testing (UAT) | 1.5 | Beta testing with school staff & students |
| Server-side integration fixes | 1 | Handle any API changes, timeout tuning, data format edge cases |
| Final polish & launch prep | 1.5 | Marketing materials, release notes, monitoring setup |
| **Phase 4 Total** | **4-6 weeks** | |

---

### **Total Effort: 34-44 weeks (8-11 months)**

**With a dedicated team:**
- **1 mobile engineer:** 34-44 weeks (8-11 months solo)
- **2 mobile engineers:** 17-22 weeks (4-5.5 months parallel, needs coordination)
- **3+ mobile engineers:** 12-16 weeks (3-4 months, diminishing returns due to coordination overhead)

---

## 💰 Cost Estimation

### Salary-Based (India)
- **1 Senior React Native Dev** (full-time 9 months): ₹35 lakhs (~$4,200/month × 9)
- **1 Mid-level Dev** (full-time 9 months): ₹20 lakhs (~$2,400/month × 9)
- **1 QA/Tester** (full-time 3 months): ₹10 lakhs
- **PM/Coordination** (20% allocation, 9 months): ₹8 lakhs
- **Total:** ~₹73 lakhs ($9,000-12,000 USD equivalent)

### Outsourced Agency (US/EU)
- **$80-120/hour × 6,800 hours** (34 weeks × 40 hrs/week × 5 devs averaged)
- **$544k - $816k USD**

### Outsourced Agency (India/Eastern Europe)
- **$25-40/hour × 6,800 hours**
- **$170k - $272k USD**

---

## 🏗️ Architecture: Reusing Web Backend

### What Stays the Same ✅
- **100% of APIs** — REST endpoints unchanged
- **Database** — PostgreSQL, no schema changes
- **Authentication** — JWT tokens, same flow
- **Business logic** — Server-side validation, calculations stay identical
- **Socket.io** — Real-time messaging, notifications work as-is

### What Changes ❌
- **Frontend framework** — React web → React Native
- **UI components** — Web (Tailwind/CSS) → Native (React Native built-ins + custom)
- **Navigation** — Web Router → React Navigation (tab bar, stack, drawer)
- **Storage** — Browser localStorage → Secure device storage (Keychain/Keystore)
- **Persistence** — Browser cache → SQLite local DB + background sync
- **Image handling** — Web img → Native Image + CameraRoll/PhotoLibrary
- **File handling** — Web File API → Native DocumentPicker, FileSystem
- **Gestures** — Web pointer/touch → Native Gesture Handler library

### Tech Stack Proposal

```
Backend (unchanged):
  - Node.js / Express
  - PostgreSQL
  - Socket.io
  - Firebase Admin SDK
  - Docker

Frontend (mobile):
  - React Native 0.74+
  - React Navigation 6+ (tab + stack navigation)
  - Redux Toolkit or Zustand (state)
  - TanStack React Query → custom offline sync (or WatermelonDB)
  - TypeScript (for type safety)
  - Firebase Cloud Messaging (native)
  - Socket.io-client (native)
  - React Native Gesture Handler (swipes, long-press)
  - React Native Reanimated (animations)
  - Expo (if choosing Expo workflow) OR Bare React Native + Xcode/Android Studio

  Complementary Libraries:
  - @react-native-async-storage/async-storage (key-value store)
  - @react-native-camera-roll/camera-roll (photo/video access)
  - react-native-document-picker (file selection)
  - react-native-vector-icons (Icon family, replaces Lucide)
  - react-native-pdf (PDF viewer, replaces web PDF viewer)
  - react-native-webview (fallback for complex HTML rendering)
```

---

## 📋 Feature-by-Feature Breakdown & Porting Effort

### High-Effort Features (3+ weeks each)

**1. Attendance Roster**
- Current: Inline editing table with rows, checkboxes, status badges
- Native: Virtualized FlatList, swipe-to-mark, date picker modal, confirmation sheet
- Effort: 3.5 weeks
- Challenges: Touch responsiveness (bigger tap targets than web), handling 100+ rows smoothly

**2. Messages & Class Channels**
- Current: Threaded messages, @mentions, file attachments, real-time Socket.io
- Native: Keyboard handling (iOS/Android differ), image/file picker, virtualized message list
- Effort: 3 weeks (Socket.io reuses backend fully)
- Challenges: Keyboard avoiding, soft keyboard lifecycle, attachment preview

**3. Timetable**
- Current: Scrollable grid, period cards, teacher info
- Native: Horizontal + vertical scrolling, time-based layout, time zone handling
- Effort: 2.5 weeks
- Challenges: Complex layout (grid-like on native is non-trivial), landscape orientation

**4. Calendar**
- Current: Interactive calendar, event popover, multi-layer display
- Native: Touch-friendly calendar picker, swipe between months, event sheet
- Effort: 2.5 weeks
- Challenges: Gesture-driven UX, large event lists, holiday color coding

**5. Dashboard (Role-Based)**
- Current: Multiple card layouts, charts, activity feed
- Native: Responsive card layouts, chart libraries (not as rich as web), infinite scroll
- Effort: 2 weeks
- Challenges: No Recharts equivalent (need lightweight alternative like `react-native-svg-charts`)

### Medium-Effort Features (1.5-2.5 weeks each)

**6. Assignments** — List, detail, submission UI, file upload
**7. Exams** — Schedule, results, scoresheet (charting challenge)
**8. Student Profile** — Info sections, document browsing, picture upload
**9. Leave Requests** — Form, date pickers, status tracking
**10. Library** — PDF viewer, document browser, downloads
**11. Notices** — List, detail, archive, notifications

### Low-Effort Features (1 week each)

**12. Settings / More Menu** — Simple list, toggles, logout
**13. Discipline Incidents** — Timeline, status, simple CRUD
**14. Admin Screens** — Bulk user management, forms (reuse form components)

---

## 🎯 Phased Launch Strategy

### **MVP Launch (Weeks 1-20, ~5 months)**
- Attendance (core teacher flow)
- Dashboard (role-based views)
- Profile (view + basic edit)
- Timetable (read-only schedule)
- Messages (real-time chat)
- Notice notifications
- Settings + logout
- **Target:** Teachers + admins first (highest ROI)
- **Estimate:** 60-70% feature parity with web

### **Phase 2 (Weeks 21-32, next 3 months)**
- Calendar (full interactive)
- Assignments (submit + view)
- Exams (results + schedule)
- Leave request flow
- Class channels (chat + posts)
- Library (PDF viewer)
- **Target:** Students + guardians can now use app
- **Estimate:** 85%+ feature parity

### **Phase 3 (Weeks 33-40, final 2 months)**
- Discipline tracking
- Advanced admin features
- Bulk upload (if needed)
- ID cards
- Performance optimization
- **Target:** 100% feature parity (minus ultra-niche features)
- **Estimate:** Near-complete feature parity

### **Beta Launch → Production**
- Internal staff testing: Week 20
- Limited school beta: Week 28
- Public launch: Week 40+

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Socket.io on native unreliable | High | Test extensively on slow networks; implement reconnection backoff |
| Image/file handling complexity | High | Use well-tested libraries (react-native-image-picker, document-picker) |
| Offline sync complexity | Medium | Use WatermelonDB or Redux persist + custom sync; start with read-only offline |
| Performance on low-end devices | Medium | Profile early (React DevTools, native profiler); virtualize all lists |
| Permission handling (camera, files) | Low | Wrapper libraries handle most; test on real devices |
| App store review delays | Medium | Submit 4-6 weeks before launch; have fallback (web app) |
| Push notification inconsistency | Medium | Reuse Firebase Admin SDK backend; test on both platforms |
| Date/time handling (timezones) | Medium | Centralize in API (server is source of truth); validate on client |

---

## 📱 Device & OS Support Strategy

### Minimum Supported Versions
- **iOS:** 13.0+ (covers 98%+ of active devices)
- **Android:** 11.0 (API 30+) — avoids legacy fragmentation (covers 85%+ of market)

### Testing Matrix
- **iOS:** iPhone SE (small), iPhone 14 (regular), iPad (tablet)
- **Android:** Pixel 4a (small), Galaxy S21 (regular), Galaxy Tab S8 (tablet)
- **Physical devices:** Yes (simulator testing insufficient for native gestures, performance)

---

## 🛠️ Skill Requirements for Team

### Senior React Native Engineer (Lead)
- 5+ years React Native experience
- Deep knowledge: Navigation, async storage, native modules
- Experience: App store submissions, performance profiling
- **Allocation:** 100%, full 9 months

### Mid-Level React Native Engineer
- 2-3 years React Native
- Solid React + JavaScript/TypeScript
- Can own 2-3 features independently
- **Allocation:** 100%, 6-9 months (ramp-up weeks 1-4)

### QA/Mobile Tester
- Mobile app testing experience
- Familiarity with iOS/Android quirks
- Can use Xcode/Android Studio, run on real devices
- **Allocation:** 50% weeks 1-20, 100% weeks 21-40

### Backend Support (0.5 FTE)
- Existing backend team member
- On-call for API integration issues, data format problems
- **Allocation:** 20% throughout

---

## 📊 Success Metrics

### Technical
- App startup time < 3 seconds (cold), < 1 second (warm)
- 60 FPS on scroll/interactions on mid-range devices
- Crash-free rate > 99.5%
- Offline mode works for core flows (attendance, timetable)

### Business
- User adoption: 40%+ of active web users within 3 months of launch
- Daily active users (DAU): 60%+ of WAU (web active users)
- Retention: 70%+ 30-day retention (first month)
- Ratings: 4.0+ stars on both app stores

### User Experience
- Time-to-task (attendance marking): < 2 minutes (vs. web: ~1.5 min)
- No regression in core workflows (all must work as well as or better than web)

---

## 🚀 Recommendation

### **Go/No-Go Decision Points**

**✅ Go if:**
1. School has 60%+ mobile-first users
2. Budget available: $150k-300k (outsource) or ₹73 lakhs (internal team)
3. Timeline acceptable: 8-11 months
4. Commitment: Dedicated team, no context switching
5. Long-term support: Plan for 2-3 engineers maintaining the app post-launch

**❌ Delay if:**
1. Budget < $100k or equivalent
2. Timeline urgent (< 6 months)
3. Team lacks React Native expertise (learning curve = +6 weeks)
4. Web app still missing critical features (finish web MVP first)

### **Recommended Approach: Phased Outsource + In-House Support**

1. **Weeks 1-10** (Foundation + core features) — Outsource to experienced RN agency
2. **Weeks 11-20** (MVP completion) — Hybrid (outsource heavy dev, in-house reviews)
3. **Weeks 21-40** (Feature completion) — Hire 1-2 in-house devs, outsource augmentation
4. **Post-Launch** — 2-3 in-house maintainers, outsource contract for surge capacity

**Estimated total cost:** $250k-350k (outsource) + ₹35 lakhs (1 senior in-house hire) = ~$300-400k USD all-in for 9-month build + first 6 months support.

---

## 📅 Timeline Example: 3 Parallel Engineers

```
Weeks 1-8:     Eng1: Auth/Nav, Eng2: Attendance, Eng3: Dashboard
Weeks 9-16:    Eng1: Messages, Eng2: Timetable, Eng3: Assignments
Weeks 17-24:   Eng1: Calendar, Eng2: Exams, Eng3: Profile
Weeks 25-32:   Eng1: Leave, Eng2: Library, Eng3: Channels
Weeks 33-40:   All: Polish, testing, optimization, launch prep
```

**Total:** 40 weeks = ~9-10 months with 3 engineers

---

## Next Steps

1. **Approval** — Confirm budget & timeline with stakeholders
2. **Team formation** — Hire or contract 2-3 React Native engineers
3. **Architecture sync** — 1-week design doc for navigation, state, offline sync strategy
4. **Dependency lock** — Agree on library versions (React Native, Nav, etc.) early
5. **Start Foundation Phase** — Weeks 1-10 deliverable: Runnable skeleton with login + 2 screens
6. **Iterate & learn** — Adjust estimates after first month based on actual velocity

