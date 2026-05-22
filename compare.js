import { execSync } from 'child_process';

try {
  console.log("=== GIT BRANCH COMPARISON (main vs dev) ===");
  
  // 1. Check status of git
  const status = execSync('git status').toString();
  console.log("\n--- git status ---");
  console.log(status);

  // 2. Check names of modified files between main and dev
  console.log("\n--- git diff main dev --name-status ---");
  const diffNames = execSync('git diff main dev --name-status').toString();
  console.log(diffNames);

  // 3. Check if there are any unpushed commits or differences between local dev and origin/dev
  console.log("\n--- git log origin/dev..dev --oneline ---");
  try {
    const unpushedDev = execSync('git log origin/dev..dev --oneline').toString();
    console.log(unpushedDev || "Nincsenek feltolatlan commitek a dev ágon.");
  } catch (e) {
    console.log("Nem sikerült lekérdezni az origin/dev és dev eltérést.");
  }

  // 4. Check if there are differences between local main and origin/main
  console.log("\n--- git log origin/main..main --oneline ---");
  try {
    const unpushedMain = execSync('git log origin/main..main --oneline').toString();
    console.log(unpushedMain || "Nincsenek feltolatlan commitek a main ágon.");
  } catch (e) {
    console.log("Nem sikerült lekérdezni az origin/main és main eltérést.");
  }

} catch (err) {
  console.error("Hiba történt a git összehasonlítás során:", err.message || err);
}
process.exit(0);
