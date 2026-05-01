# API Endpoint Manifest

This manifest lists the main API routes available in the system.

## Global Prefixes
- `/api/public/*`: Accessible by all authenticated users (Public content).
- `/api/admin/*`: Restricted to Global Admins.
- `/api/school-admin/*`: Restricted to School Admins.
- `/api/teacher/*`: Restricted to Teachers and higher.
- `/api/student/*`: General student operations (often aliases to specific routers).

## Core Feature Routes

### 1. Curriculum & Content
- **`GET /api/public/professions`**: List all professions.
- **`GET /api/public/subjects`**: List subjects (supports `professionId` query).
- **`GET /api/public/modules`**: List modules (supports `subjectId` query).
- **`POST /api/admin/ikk/import`**: Start PTT/IKK PDF import background job.

### 2. User & Auth
- **`GET /api/auth/user`**: Current user profile.
- **`POST /api/auth/register`**: Local registration.
- **`POST /api/auth/login`**: Local login.
- **`POST /api/student/select-profession`**: Initial profession selection for new students.

### 3. AI & Generation
- **`POST /api/ai/modules/:id/regenerate`**: Re-generate concise/detailed content.
- **`POST /api/ai/modules/:id/generate-presentation`**: Generate interactive HTML slides.
- **`POST /api/ai/quiz/generate`**: Generate a new test from module content.

### 4. Classroom & Grading
- **`GET /api/teacher/classes`**: Classes managed by the teacher.
- **`GET /api/practical-grades/student/:id`**: Student's practical performance.
- **`POST /api/practical-grades`**: Assign a grade for a practical task.

### 5. Finances & Costs
- **`GET /api/admin/costs/summary`**: Monthly ROI and cost aggregation.
- **`POST /api/admin/costs`**: Record a new expense.

### 6. Social & Communication
- **`GET /api/messages/private`**: List private conversations.
- **`GET /api/community/groups`**: Collaborative learning groups.
- **`POST /api/notifications/mark-read`**: Clear user notifications.

## Implementation Details
- All routes use **Express** on the backend.
- **Drizzle ORM** is used for database interaction.
- Errors are returned in JSON format with a `message` and optional `hint`.
