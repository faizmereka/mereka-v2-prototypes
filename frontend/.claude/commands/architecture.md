# Architecture

Display the project architecture and structure.

## Workspace Structure

```
mereka-frontend-workspace/
├── angular.json                 # Workspace configuration
├── package.json                 # Shared dependencies
├── tsconfig.json                # Base TypeScript config
│
├── projects/
│   ├── auth/                    # auth.mereka.io - Authentication
│   ├── web/                     # mereka.io - Public website
│   ├── app/                     # app.mereka.io - Main app
│   ├── checkout/                # checkout.mereka.io - Payments
│   ├── admin/                   # admin.mereka.io - Admin dashboard
│   │
│   └── libs/                    # Shared libraries
│       ├── ui/                  # @mereka/ui
│       ├── core/                # @mereka/core
│       ├── models/              # @mereka/models
│       └── utils/               # @mereka/utils
│
└── docs/                        # Documentation
```

## Port Assignments

| App | Port | Domain |
|-----|------|--------|
| web | 4200 | mereka.io |
| auth | 4201 | auth.mereka.io |
| app | 4202 | app.mereka.io |
| checkout | 4203 | checkout.mereka.io |
| admin | 4204 | admin.mereka.io |

## Shared Libraries

- `@mereka/ui` - Reusable UI components
- `@mereka/core` - Services, guards, interceptors
- `@mereka/models` - TypeScript interfaces and types
- `@mereka/utils` - Utility functions

Run `ng build <project>` to build any specific project.
