# Global Learning System

## Overview

This project is an AI-powered educational platform designed to generate enhanced learning content. It integrates multimedia elements such as Wikipedia links, YouTube videos, and interactive Mermaid diagrams to provide a comprehensive and engaging learning experience. The system aims to offer adaptive content delivery, supporting various learning preferences and facilitating progress tracking within a collaborative environment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Framework**: React with TypeScript, utilizing Vite for development and optimized builds.
- **Components**: Radix UI for robust UI components, styled with Tailwind CSS for a modern aesthetic.
- **Routing**: Client-side routing for a seamless Single Page Application (SPA) experience.
- **Content Display**: Adaptive content views (concise/detailed) with embedded multimedia.
- **Interactive Elements**: Support for interactive diagrams, videos, and external resources.

### Technical Implementations
- **Backend**: Node.js with Express.js, written in TypeScript, providing REST API endpoints.
- **Database**: PostgreSQL with Drizzle ORM for schema management and data persistence.
- **AI Integration**: Utilizes multiple AI providers, including Google Generative AI, with a custom router for reliability.
- **Session Management**: Express sessions with a PostgreSQL store for user authentication and state.
- **File Handling**: Multer for file uploads and serving static assets like generated SVG diagrams.
- **AI-Powered Content Generation**: Features include an enhanced module generator for concise and detailed content versions, sequential processing for AI tasks, professional field detection, and integration with Wikipedia and YouTube for content enrichment. Mermaid syntax conversion to SVG is also supported.
- **Content Management**: An admin interface provides CRUD operations for educational modules, subjects, and users, along with content versioning and bulk operations.
- **Data Flow**: Base educational modules are created, AI enhances them with internet-researched content, summaries, links, videos, and diagrams, which are then delivered adaptively to students, with progress tracking in place.

### System Design Choices
- **Development Environment**: Configured for Replit, using Vite with React Fast Refresh, local PostgreSQL, and environment variable management.
- **Production Deployment**: Optimized Vite builds, Drizzle Kit for database migrations, static asset serving via Express, and Node.js process management.
- **Scalability**: Incorporates connection pooling, AI rate limiting through sequential processing, in-memory caching, and queue management for background tasks to ensure efficient resource utilization.

## External Dependencies

### AI Services
- **Google Generative AI**: Primary AI for content generation and enhancement.
- **Custom AI Router**: Manages routing across multiple AI providers.

### Third-Party APIs
- **YouTube Data API**: Used for searching and integrating educational videos.
- **Wikipedia API**: For link validation and content enrichment.

### Infrastructure Services
- **PostgreSQL**: The primary database.
- **Local File System**: Used for storing generated SVG diagrams.
- **PostgreSQL-backed Session Store**: For managing user sessions.

## Recent Changes

### August 11, 2025 - Felhasználótörlési és szerepváltási problémák megoldása
**Probléma:** Felhasználók nem törölhetők voltak, mert 16 adatbázis táblában vannak hivatkozva idegen kulcsokon keresztül. Szerepváltáskor a korábbi szerephez tartozó adatok nem törlődtek.

**Megoldás:**
- Átfogó `deleteUser()` funkció implementálva mind a 16 tábla kezelésével
- `cleanupRoleSpecificData()` hozzáadva szerepváltáskor automatikus adattisztításhoz
- Proper cascade törlési sorrend a foreign key ütközések elkerülésére
- Teacher→Student váltáskor teacher_students kapcsolatok automatikusan törlődnek
- Student→Teacher váltáskor module_progress adatok törlődnek
- Admin szerepváltozáskor admin_messages adatok törlődnek

**Érintett táblák:** chat_messages, module_progress, api_calls, admin_messages, teacher_students, group_members, project_participants, discussions, peer_reviews, equipment_manuals, equipment_models, community_groups, community_projects, classes

### June 27, 2025 - Bold linkek javítása Wikipedia linkekkel
**Probléma:** AI újragenerálás során a bold szavak nem kaptak linkeket a webes keresési API (DataSEO) megbízhatatlansága miatt.

**Megoldás:**
- Visszaállított egyszerű Wikipedia linkkelési módszer
- Bold szavak közvetlenül hu.wikipedia.org linkeket kapnak
- Eltávolított bonyolult webes keresési logika a bold linkkelésből
```