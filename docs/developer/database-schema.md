# Database Schema Overview

This document provides a high-level overview of the database structure for the Interactive Learning platform.

## Core Educational Hierarchy

```mermaid
erDiagram
    SCHOOL ||--o{ PROFESSION : "manages"
    SCHOOL ||--o{ CLASS : "contains"
    PROFESSION ||--o{ SUBJECT : "has"
    SUBJECT ||--o{ MODULE : "contains"
    CLASS ||--o{ USER : "students/teachers"
    MODULE ||--o{ FLASHCARD : "has"
    MODULE ||--o{ TEST_RESULT : "graded by"
    MODULE ||--o{ PRACTICAL_GRADE : "graded by"
```

## Table Definitions

### 1. Schools (`schools`)
The root entity for organizational multi-tenancy.
- `id`: Primary Key
- `name`: School name
- `imageUrl`: Logo/Cover

### 2. Users (`users`)
Supports Students, Teachers, Admins, and School Admins.
- `role`: "student", "teacher", "admin", "school_admin"
- `authType`: "local" or "replit"
- `xp`: Experience points for gamification
- `completedModules`: Array of module IDs
- `schoolId`: Reference to school

### 3. Professions (`professions`)
Vocational programs (e.g., Hegesztő).
- `name`, `description`
- `iconName`: Lucide icon reference
- `schoolId`: Null for global, ID for school-specific

### 4. Subjects (`subjects`)
Areas within a profession (e.g., Anyagismeret).
- `code`: Official IKK code (e.g., 3.4.1)
- `type`: "theory" or "practical"
- `hours`: Total lesson hours

### 5. Modules (`modules`)
Specific learning units within a subject.
- `sectionCode`: Hierarchical code (e.g., 3.4.1.2.1)
- `type`: "theory" or "practical"
- `conciseContent` / `detailedContent`: AI-generated markdown
- `keyConceptsData`: JSON with definitions and YouTube videos
- `practicalTasks`: JSON array for practical steps
- `presentationData`: JSON for interactive presentations

### 6. Learning Progress
- **`test_results`**: Automatic quiz scores. Includes `moduleTitle`, `subjectName`, and `moduleNumber` metadata for durability.
- **`practical_grades`**: Teacher-assigned grades (1-5) for tasks. Includes `moduleTitle`, `subjectName`, and `moduleNumber` metadata for durability.
- **`attendance`**: Daily attendance tracking (auto-login or manual). Includes `studentName` and `className` metadata for durability.
- **`student_avatars`**: Tamagotchi-style progression for students.

## AI & System Configurations
- **`ai_settings`**: OpenAI model, temperature, and tokens.
- **`api_calls`**: Cost tracking for OpenAI/Google services.
- **`system_settings`**: Encrypted API keys and global flags.

## Social Features
- **`community_groups`**: Peer-to-peer learning groups.
- **`discussions`**: Threaded forums for modules/projects.
- **`private_messages`**: Direct Student-Teacher communication.
