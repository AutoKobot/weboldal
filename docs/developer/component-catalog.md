# UI Component Catalog

This project uses **Shadcn UI** components. Always prefer using these existing components instead of creating custom HTML elements or styling from scratch.

## Core Components

| Component | Usage | Location |
|-----------|-------|----------|
| **Button** | All actions, triggers, and links. | `ui/button.tsx` |
| **Card** | Containers for modules, subjects, and stats. | `ui/card.tsx` |
| **Badge** | Status indicators, tags, and codes. | `ui/badge.tsx` |
| **Dialog** | Modals for editing and creating content. | `ui/dialog.tsx` |
| **Form** | Zod-validated input structures. | `ui/form.tsx` |
| **Input / Textarea** | Standard text data entry. | `ui/input.tsx`, `ui/textarea.tsx` |
| **Select** | Dropdowns for categories and roles. | `ui/select.tsx` |
| **Tabs** | Navigation between different views (Grid/List). | `ui/tabs.tsx` |

## Advanced UI

- **Charts**: Used in Admin/Teacher dashboards for stats. (`ui/chart.tsx`)
- **Toaster**: Global notification system. (`ui/toast.tsx`, `ui/toaster.tsx`)
- **Carousel**: Image/Module galleries. (`ui/carousel.tsx`)
- **Skeleton**: Loading states for cards. (`ui/skeleton.tsx`)

## Specialized Project Components

- **ModuleCard**: Displaying learning units. (`@/components/module-card.tsx`)
- **FlashcardQuiz**: Interactive study tool. (`@/components/flashcard-quiz.tsx`)
- **DynamicBackground**: Animated student UI background. (`@/components/dynamic-background.tsx`)
- **Sidebar / MobileNav**: Main application navigation. (`@/components/sidebar.tsx`, `@/components/mobile-nav.tsx`)

## Design System Tokens

Refer to `index.css` for custom color tokens:
- `--primary`: Main brand color (Deep Blue/Purple)
- `--secondary`: Success/Theory color (Emerald Green)
- `--accent`: Warning/Practical color (Vibrant Orange)
- `--student-warm`: Light background for the student dashboard.
