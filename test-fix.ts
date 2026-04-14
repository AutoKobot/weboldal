import "dotenv/config";
import { db } from "./server/db";
import { users, classAnnouncements, announcementAcknowledgements } from "./shared/schema";
import { DatabaseStorage } from "./server/storage";
import { eq } from "drizzle-orm";

const storage = new DatabaseStorage();

async function runTest() {
  console.log("--- Belső Teszt Indítása ---");

  try {
    // 1. Keressünk egy diákot, akinek van osztálya
    const allStudents = await db.select().from(users).where(eq(users.role, 'student'));
    const student = allStudents.find(u => u.classId);

    if (!student) {
      console.error("Hiba: Nem találtam olyan diákot, akinek be van állítva osztály (classId)!");
      process.exit(1);
    }

    console.log(`Teszt diák: ${student.username} (ID: ${student.id}, ClassID: ${student.classId})`);

    // 2. Keressünk egy tanárt (vagy használjuk az admin-t) a küldéshez
    const teachers = await db.select().from(users).where(eq(users.role, 'teacher')).limit(1);
    const teacherId = teachers.length > 0 ? teachers[0].id : student.id;

    // 3. Hozzunk létre egy teszt bejelentést
    const testTitle = "Teszt Üzenet " + new Date().toLocaleTimeString();
    console.log(`Bejelentés létrehozása: "${testTitle}"...`);
    
    const announcement = await storage.createAnnouncement({
      teacherId: teacherId,
      classId: student.classId!,
      title: testTitle,
      content: "Ez egy automatikus teszt üzenet a javítás ellenőrzéséhez.",
      type: "info",
      isActive: true,
      options: ["Értettem"]
    });

    console.log(`Bejelentés létrehozva (ID: ${announcement.id})`);

    // 4. Ellenőrizzük, hogy a rendszer megtalálja-e a diáknak a bejelentést
    console.log("Lekérdezés futtatása a diák nevében az új 'notExists' logikával...");
    const pending = await storage.getUnacknowledgedAnnouncements(student.id, student.classId!);
    
    const found = pending.find(a => a.id === announcement.id);

    if (found) {
      console.log("✅ SIKER: Az új lekérdezési logika megtalálta a bejelentést a diák számára!");
      console.log("A bejelentés adatai:", JSON.stringify(found, null, 2));
    } else {
      console.error("❌ HIBA: A bejelentés nem jelent meg a diák listájában!");
      console.log("Visszadott pending lista hossza:", pending.length);
    }

    // 5. Takarítás - töröljük a teszt üzenetet
    console.log("Teszt adat törlése...");
    await storage.deleteAnnouncement(announcement.id);
    console.log("Takarítás kész.");

  } catch (error) {
    console.error("❌ Váratlan hiba a teszt során:", error);
  }

  console.log("--- Teszt Vége ---");
  process.exit(0);
}

runTest();
