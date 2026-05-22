# Felhasználói Szerepkörök Kapcsolati Riport

## 1. SZEREPKÖRÖK ÉS JOGOSULTSÁGOK

### Létező role-ok (4 darab)

| Role | Leírás | Route prefix |
|------|--------|-------------|
| `admin` | Rendszerszintű admin – globális hozzáférés | `/api/admin/` |
| `school_admin` | Iskolai admin – saját iskolája adataihoz fér hozzá | `/api/school-admin/` |
| `teacher` | Tanár – osztályaihoz tartozó diákok adatait kezeli | `/api/teacher/` |
| `student` | Diák – tananyag, tesztek, saját progresszió | `/api/user/` |

### Middleware-ek (auth ellenőrzés)

| Middleware | Fájl | Engedélyezett role-ok |
|-----------|------|----------------------|
| `combinedAuth` | `middleware.ts` | Minden authentikált felhasználó |
| `checkSchoolAdmin` | `school-admin.ts` | `school_admin` **VAGY** `admin` |
| `checkTeacher` | `teacher.ts` | `teacher` **VAGY** `admin` **VAGY** `school_admin` |
| `checkTeacherOrAdmin` | `practical-grades.ts` | `teacher` **VAGY** `admin` **VAGY** `school_admin` |
| `adminOnly` | `admin.ts` | **CSAK** `admin` |

### Route-ok szerepkörönként

| Végpont | Role | Middleware |
|---------|------|-----------|
| `/api/admin/*` | admin | `combinedAuth` + `adminOnly` |
| `/api/school-admin/*` | school_admin, admin | `combinedAuth` + `checkSchoolAdmin` |
| `/api/teacher/*` | teacher, admin, school_admin | `combinedAuth` + `checkTeacher` |
| `/api/user/*` | student | `combinedAuth` |
| `/api/public/*` | bárki | nincs |

---

## 2. ADATKAPCSOLATOK

### Adatbázis kapcsolati diagram

```
schools
  ├── id ───────────────────────────┐
  │                                 │
  ├── classes.schoolId              │
  │     └── users.classId           │
  │     └── dailyAttendance.classId  │
  │     └── attendance.classId      │
  │                                 │
  ├── users.schoolId ───────────────┘
  ├── professions.schoolId
  ├── subjects.schoolId
  └── modules.schoolId

users
  ├── id
  ├── role (student | teacher | school_admin | admin)
  ├── schoolId        → schools.id
  ├── classId         → classes.id (diákoknál)
  ├── schoolAdminId   → users.id (aki létrehozta)
  ├── assignedTeacherId → users.id (tanár-diák direkt kapcsolat)
  └── selectedProfessionId → professions.id

classes
  ├── id ─────────────── users.classId
  ├── schoolId          → schools.id
  ├── assignedTeacherId → users.id (osztályfőnök)
  ├── professionId      → professions.id
  └── schoolAdminId     → users.id (aki létrehozta)
```

### Főbb kapcsolatok

| Kapcsolat | Típus | Leírás |
|-----------|-------|--------|
| `school → classes` | 1:N | Egy iskolában több osztály |
| `school → users` | 1:N | Egy iskolában több felhasználó |
| `class → users (classId)` | 1:N | Osztályhoz tartozó diákok |
| `class → teacher (assignedTeacherId)` | N:1 | Osztályfőnök |
| `user → user (schoolAdminId)` | 1:N | Ki hozta létre a felhasználót |
| `user → user (assignedTeacherId)` | N:1 | Direkt tanár-diák kapcsolat |
| `profession → classes` | 1:N | Szakma → osztályok |

---

## 3. AUTORIZÁCIÓS LOGIKA

### School Admin autorizáció

A `checkSchoolAdmin` middleware `school_admin` VAGY `admin` role-t enged. A további ellenőrzés inline történik:

```typescript
// Példa: PATCH /classes/:id
const adminUser = await storage.getUser(req.user.id);
if (req.user.role !== 'admin' && classData.schoolAdminId !== req.user.id 
    && (!adminUser?.schoolId || classData.schoolId !== adminUser.schoolId)) {
  return res.status(403).json({ message: "Forbidden" });
}
```

**Logika:**
- `admin` role → mindenhez hozzáfér
- `school_admin` → csak olyan adatokhoz, ahol `schoolAdminId === saját_id` VAGY `schoolId === saját_schoolId`

### Tanár autorizáció

```typescript
// Példa: GET /classes/:id/grades
if (req.user.role === 'teacher' && classData.assignedTeacherId !== req.user.id) {
  return res.status(403).json({ message: "You are not assigned to this class" });
}
```

**Logika:**
- `admin` / `school_admin` → minden osztályhoz hozzáfér
- `teacher` → csak a `classes.assignedTeacherId === saját_id` osztályokhoz

### Admin vs School Admin különbség

| Szempont | admin | school_admin |
|----------|-------|-------------|
| Iskolák | Mindegyiket látja | Csak a sajátját |
| Felhasználók | Globális hozzáférés | Csak saját iskolájában |
| Route-ok | `/api/admin/*` + `/api/school-admin/*` | Csak `/api/school-admin/*` |
| Létrehozás | Közvetlenül DB-ből | School admin által |

---

## 4. ADATFOLYAMOK

### 1. Iskola admin létrehoz egy tanárt

```
School Admin → POST /api/school-admin/register-teacher
  → storage.createUser({ role: 'teacher', schoolAdminId, schoolId })
  → Tanár bejelentkezik → GET /api/teacher/classes
    → storage.getClassesByTeacher(teacherId)
      → SELECT * FROM classes WHERE assignedTeacherId = teacherId
```

**Probléma:** Ha a school admin nem állítja be az `assignedTeacherId`-t az osztályon, a tanár üres osztálylistát lát.

### 2. Iskola admin létrehoz egy diákot

```
School Admin → POST /api/school-admin/register-student
  → storage.createUser({ role: 'student', schoolAdminId, schoolId, classId })
  → Diák bejelentkezik → látja a classId alapján az osztály tananyagát
```

**Probléma:** Ha nincs classId megadva, a diák nem tartozik egyik osztályhoz sem.

### 3. Tanár rögzíti a jelenlétet

```
Teacher → POST /api/teacher/classes/:id/attendance
  → checkTeacher (middleware) → classData.assignedTeacherId ellenőrzés
  → storage.upsertAttendance(...)
  → Bárki lekérheti: GET /api/teacher/classes/:id/attendance (ha van jogosultsága)
```

**Adat elérés:**
- Tanár → csak a saját osztályai
- School admin → saját iskolája összes osztálya
- Admin → minden

### 4. Diák kitölt egy tesztet

```
Student → POST /api/modules/:id/test (feltételezett)
  → storage.createTestResult({ userId, moduleId, score, ... })
  → GET /api/teacher/classes/:id/grades
    → Tanár/school_admin/admin látja az eredményt
    → Diák csak önmagáét: GET /api/user/test-results
```

---

## 5. HIÁNYOSSÁGOK ÉS PROBLÉMÁK

### 🔴 MAGAS – Iskola elkülönítés hiánya a school-admin végpontokban

| Végpont | Probléma |
|---------|----------|
| `GET /students` | Ha `req.user.role === 'admin'`, az `storage.getAllStudents()` MINDEN diákot visszaad. Ha `school_admin`, az `storage.getStudentsBySchoolAdmin()` csak a `schoolAdminId` alapján szűr, DE ha a school_admin-nak nincs beállítva `schoolId`, akkor a `schoolId` alapú ellenőrzés nem működik. |
| `GET /teachers` | Ugyanaz, mint a students. A `getTeachersBySchoolAdmin` a `schoolAdminId`-ra támaszkodik, nem a `schoolId`-ra. |
| `POST /register-teacher` | A létrehozott tanár nem kap `schoolId`-t, csak `schoolAdminId`-t. Ha a school_admin később iskolát vált, a régi tanárok nem követik. |

### 🟡 KÖZEPES – Tanári jogosultság ellenőrzés inkonzisztencia

- A `GET /classes/:id/grades` endpoint `if (req.user.role === 'teacher' && ...)` ellenőrzést használ, ami azt jelenti, hogy ha `admin` vagy `school_admin` hívja, **nincs ellenőrzés** → hozzáférhet más iskolák osztályaihoz is (bár a school-admin route-okon keresztül ez nem probléma, de a teacher route-on keresztül potenciális adatszivárgás).
- A `GET /classes/:id/notes` és `GET /classes/:id/schedules` **NEM** ellenőrzi az `assignedTeacherId`-t – bármely tanár hozzáférhet bármely osztály adataihoz.

### 🟡 KÖZEPES – Duplikált autorizációs logika

Az `assignedTeacherId` ellenőrzés minden teacher route-ban külön-külön van implementálva:
- `/classes/:id/grades`: inline check
- `/classes/:id/roster`: inline check
- `/classes/:id/attendance`: inline check
- `/classes/:id/daily-attendance`: NINCS check!
- `/classes/:id/notes`: NINCS check!
- `/classes/:id/schedules`: NINCS check!

Következetlen, több helyről hiányzik.

### 🟢 ALACSONY – Iskola adminok egymás adatait láthatják schoolId nélkül

Ha egy school_admin-nak nincs `schoolId` mező kitöltve (csak `schoolAdminId`), akkor a `POST /classes/:id/bulk-import` autorizációs ellenőrzése:

```typescript
classData.schoolAdminId !== req.user.id && (!adminUser?.schoolId || classData.schoolId !== adminUser.schoolId)
```

nem véd megfelelően – ha a school_admin-ok `schoolId` nélkül lettek létrehozva, akkor a `schoolAdminId` az egyetlen védelem, ami viszont nem iskola szintű.

---

## 6. JAVÍTÁSOK (2026.05.22.)

| # | Probléma | Státusz |
|---|----------|---------|
| 1 | `getStudentsBySchoolAdmin` schoolAdminId-alapú, schoolId nélkül gyenge | ✅ **JAVÍTVA** - Most először `schoolId`-ra szűr, ha van; fallback `schoolAdminId` |
| 2 | Tanár route-okból hiányzó assignedTeacherId ellenőrzés | ✅ **JAVÍTVA** - 4 helyen (daily-attendance GET/POST, attendance POST, bulk, notes GET, export) került be az ellenőrzés |
| 3 | Duplikált autorizációs logika minden teacher route-ban | ⏳ Nyitott (refaktorálás később) |
| 4 | SchoolId hiánya az iskola- és tanárlétrehozáskor | ⏳ Nyitott (`school-admin.ts` regisztrációk) |
| 5 | `checkSchoolAdmin` és `checkTeacher` ugyanazt engedi (admin is) | ⏳ Nyitott (tervezési döntés) |

## 7. ÖSSZEFOGLALÓ TÁBLÁZAT

| # | Probléma | Súlyosság | Érintett fájl(ok) |
|---|----------|-----------|-------------------|
| 3 | Duplikált autorizációs logika minden teacher route-ban | 🟡 KÖZEPES | `teacher.ts` |
| 4 | SchoolId hiánya az iskola- és tanárlétrehozáskor | 🟡 KÖZEPES | `school-admin.ts` |
| 5 | `checkSchoolAdmin` és `checkTeacher` ugyanazt engedi (admin is) | 🟢 ALACSONY | `school-admin.ts`, `teacher.ts` |
