import { db } from './db';
import { users, studentAvatars } from '@shared/schema';
import { eq, like } from 'drizzle-orm';
import { storage } from './storage';

async function run() {
  console.log("Keresem a 'borgai74' felhasználót...");
  const userList = await db.select().from(users).where(like(users.username, '%borgai74%'));
  let targetUser = userList[0];
  
  if (!targetUser) {
    const emailList = await db.select().from(users).where(like(users.email, '%borgai74%'));
    targetUser = emailList[0];
  }

  if (!targetUser) {
    console.log("❌ Nem találtam a borgai74 felhasználót.");
    process.exit(1);
  }

  console.log(`✅ Felhasználó megtalálva: ${targetUser.username || targetUser.email}. Adok neki 2000 szabad XP-t...`);
  await db.update(users).set({ xp: (targetUser.xp || 0) + 2000 }).where(eq(users.id, targetUser.id));

  console.log(`✅ Kiválasztom neki a 'fekete_macska' avatárt...`);
  await storage.selectStudentAvatar(targetUser.id, 'fekete_macska');

  console.log("🎉 Sikeresen beállítva! Lépj be, és rögtön ott lesz a macska + a táp.");
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
