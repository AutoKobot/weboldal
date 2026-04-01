import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkUser() {
  try {
    const [user] = await db.select().from(users).where(eq(users.username, "BorgaI74"));
    if (user) {
      console.log("User found:");
      console.log("ID:", user.id);
      console.log("Username:", user.username);
      console.log("Role:", user.role);
      console.log("Auth Type:", user.authType);
      console.log("Password hash exists:", !!user.password);
    } else {
      console.log("User 'BorgaI74' NOT FOUND in database.");
    }
    process.exit(0);
  } catch (err) {
    console.error("Database error:", err);
    process.exit(1);
  }
}

checkUser();
