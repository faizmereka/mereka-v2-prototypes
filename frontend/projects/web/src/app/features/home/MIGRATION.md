# Homepage Migration: mereka-web-ssr → mereka-frontend-workspace-v2

## Overview

This document tracks the migration of the homepage feature from the legacy `mereka-web-ssr` (v1, Firebase/Algolia)
to the current `mereka-frontend-workspace-v2` (v2, Angular 21+, MongoDB backend).

**Branch:** `migrate/homepage`
**Status:** In Progress

---

## What Was Copied

The following files were copied from `mereka-web-ssr` as reference/starting point:

| File | Description |
|------|-------------|
| `pages/home/home.page-copy.ts` | SSR home page TypeScript (old patterns) |
| `pages/home/home.page-copy.html` | SSR home page HTML template |
| `pages/home/home.page.scss` | SSR shared SCSS styles (layout, section classes) |
| `components/home-section-*/` | All 9 section components from SSR |

---

## Component Migration Status

| Component | Selector (old → new) | Status | Notes |
|-----------|----------------------|--------|-------|
| `home-section-hero` | `ssr-home-section-hero` → `home-section-hero` | ✅ Done | Lottie kept; search panel, mobile view detection TODOs |
| `home-section-experts` | `ssr-home-section-experts` → `home-section-experts` | ✅ Done | Uses `ExpertListItem[]` input |
| `home-section-expertises` | `ssr-home-section-expertises` → `home-section-expertises` | ✅ Done | Uses `HomeExpertiseItem[]` input |
| `home-section-experiences` | `ssr-home-section-experiences` → `home-section-experiences` | ✅ Done | Filter UI kept but disabled (TODO) |
| `home-section-jobs` | `ssr-home-section-jobs` → `home-section-jobs` | ✅ Done | Uses `JobListItem[]` input; isClientViewable removed |
| `home-section-reviews` | `ssr-home-section-reviews` → `home-section-reviews` | ✅ Done | Uses new `HomeReviewItem[]` input |
| `home-section-marketplace` | `ssr-home-section-marketplace` → `home-section-marketplace` | ✅ Done | Self-contained, no data |
| `home-section-corporate` | `ssr-home-section-corporate` → `home-section-corporate` | ✅ Done | Self-contained, no data |
| `home-section-banner` | `ssr-home-section-banner` → `home-section-banner` | ✅ Done | Lottie kept |

---

## Key Architecture Changes

### Data Flow
**Old (SSR):** Each component had its own use-case-based data fetching (Algolia/Firebase).
```
Component → UseCase → Repository → Algolia/Firebase
```

**New (v2):** Data is fetched by the parent `HomePage` and passed via `input()`.
```
HomePage → Services (ExpertService, HubService, JobService, HomeService)
         → Components via input()
```

### Angular Patterns
| Old (SSR) | New (v2) |
|-----------|----------|
| `@Inject(TOKEN)` in constructor | `inject(Token)` |
| `@Input() data` | `input<Type>()` |
| `constructor(private svc: Service)` | `private readonly svc = inject(Service)` |
| Old `*ngFor`, `*ngIf` directives | Native `@for`, `@if` control flow |
| `AsyncPipe` with Promises | Signal-based `input()` data |
| `this.dto$ = useCase.execute()` | Data from parent `input()` |

### Removed Dependencies (SSR-only)
- `@common/src/...` (common library not in v2)
- `GetHomeSectionExpertsUseCase`, `GetHomeSectionExpertisesUseCase`, etc.
- `ToggleFavouriteUseCase`, `IsFavouriteUseCase`
- `GetReviewFeaturedUseCase`
- `GetAuthStateUseCase`, `GetUserProfileUseCase`
- `MEREKA_BASE_URL_TOKEN`
- `ImageKitPipe`
- `ViewBreakpointService`
- `HeaderSearchService`, `HeaderSearchPanelToggleComponent`
- `COMMON_ENVIRONMENT`
- Firebase `@angular/fire/auth`

### Import Path Changes
| Old (SSR) | New (v2) |
|-----------|----------|
| `@ui/ui-card/templates/ui-card-expert` | `@mereka/ui/ui-card/templates/ui-card-expert` |
| `@ui/ui-swiper/ui-swiper` | `@mereka/ui/ui-swiper/ui-swiper` |
| `@ui/ui-loader-skeleton/...` | `@mereka/ui/ui-loader-skeleton/...` |
| `@ui/ui-button/ui-button` | `@mereka/ui/ui-button/ui-button` |

---

## Data Model Mapping

### Experts Section
| Old SSR Field | New `ExpertListItem` Field | UICardExpert Input |
|---------------|---------------------------|-------------------|
| `expert.id` | `expert._id` | `id` |
| `expert.expertName` | `expert.name` | `title` |
| `expert.expertImage` | `expert.profilePhoto` | `image` |
| `expert.expertiseName` | `expert.professionalTitle` (wrapped in array) | `expertise` |
| N/A | `/experts/${expert.username}` | `url` |

### Expertises Section
| Old SSR Field | New `HomeExpertiseItem` Field | UICardExpertise Input |
|---------------|------------------------------|----------------------|
| `expertise.id` | `expertise._id` | `id` |
| `expertise.title` | `expertise.expertiseTitle` | `title` |
| `expertise.summary` | `expertise.expertiseSummary` | `description` |
| `expertise.image` | `expertise.coverPhoto` | `image` |
| `expertise.amount`/`isFree` | calculated from `ticket[]` | `price` |

### Experiences Section
| Old SSR Field | New `HomeExperienceItem` Field | UICardExperience Input |
|---------------|-------------------------------|----------------------|
| `experience.id` | `experience._id` | `id` |
| `experience.title` | `experience.experienceTitle` | `title` |
| `experience.coverPhotoUrl` | `experience.coverPhoto` | `image` |
| `experience.expertHub` | `experience.hostDetails?.[0]?.name` | `host` |
| `experience.rating` | `experience.rating` | `rating` |
| `experience.price`/`isFree` | calculated from `ticket[]` | `price` |

---

## TODO Items (Features Not Yet Available)

### home-section-hero
- [ ] **Mobile search panel toggle** (`HeaderSearchPanelToggleComponent` not available in v2)
- [ ] **Mobile/desktop detection** (`ViewBreakpointService` not yet ported to v2)
  - Currently: Lottie animation shown on all screen sizes. In SSR it was desktop-only.

### home-section-experts
- [ ] **Favourite/bookmark toggle** (`ToggleFavouriteUseCase` + `IsFavouriteUseCase` not in v2)
  - Currently: `isFavourite` always false, `(favorite)` event ignored
- [ ] **ImageKit image optimization** (`ImageKitPipe` not available in v2)

### home-section-expertises
- [ ] **Favourite/bookmark toggle** (same as experts)
- [ ] **ImageKit image optimization**
- [ ] **Expert image on expertise cards** (field mapping unclear in new API)

### home-section-experiences
- [ ] **Experience filters** (Today / The Weekend / Free) — requires filter API integration
  - Old: `selectFilterType(filterType)` called use case with filter
  - Currently: Filter buttons render but have no action; commented out
- [ ] **Favourite/bookmark toggle**
- [ ] **ImageKit image optimization**
- [ ] **Google Analytics tracking** (`GoogleAnalyticsService` not in v2 yet)

### home-section-jobs
- [ ] **Client visibility gating** (`isClientViewable`) — Old: showed job details only if user had roles
  - Old: Used `GetAuthStateUseCase` + `GetUserProfileUseCase` + session cookie
  - Currently: `isPrivate` always false (all jobs shown publicly)
- [ ] **Swiper mobile carousel** needs job data mapping review (UICardJob inputs)

### home-section-reviews
- [ ] **Reviews API** — requires new v2 backend endpoint for featured reviews
  - Create: `ReviewService` in web project
  - Add: Reviews fetching to `home.resolver.ts`
  - Model: `HomeReviewItem` interface added to `home.model.ts`

### home.page.html
- [ ] **Collection Section Join / CTA** — `collection-section-join` component from SSR not in v2
  - Currently replaced with inline CTA section (gradient banner + "Post a Job" button)
- [ ] **Mobile Navbar** (`common-mobile-navbar`) — not available in v2 yet

---

## Files Modified

```
projects/web/src/app/features/home/
├── MIGRATION.md                              ← This file
├── models/
│   └── home.model.ts                         ← Added HomeReviewItem interface
├── components/
│   ├── home-section-hero/
│   │   └── home-section-hero.component.ts    ← Migrated
│   ├── home-section-experts/
│   │   ├── home-section-experts.component.ts ← Migrated
│   │   └── home-section-experts.component.html ← Updated
│   ├── home-section-expertises/
│   │   ├── home-section-expertises.component.ts ← Migrated
│   │   └── home-section-expertises.component.html ← Updated
│   ├── home-section-experiences/
│   │   ├── home-section-experiences.component.ts ← Migrated
│   │   └── home-section-experiences.component.html ← Updated
│   ├── home-section-jobs/
│   │   ├── home-section-jobs.component.ts    ← Migrated
│   │   └── home-section-jobs.component.html  ← Updated
│   ├── home-section-reviews/
│   │   ├── home-section-reviews.component.ts ← Migrated
│   │   └── home-section-reviews.component.html ← Updated
│   ├── home-section-marketplace/
│   │   └── home-section-marketplace.component.ts ← Migrated
│   ├── home-section-corporate/
│   │   └── home-section-corporate.component.ts ← Migrated
│   └── home-section-banner/
│       └── home-section-banner.component.ts  ← Migrated
└── pages/
    └── home/
        ├── home.page.ts                      ← Updated
        └── home.page.html                    ← Replaced with component-based layout
```
