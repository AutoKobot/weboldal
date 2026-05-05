import { storage } from '../server/storage';
import * as fs from 'fs';
import * as path from 'path';

async function backupDatabase() {
    console.log('--- ADATBÁZIS MENTÉS INDÍTÁSA ---');
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `db_backup_${timestamp}.json`);

    try {
        // Fetch critical data
        console.log('Adatok lekérése...');
        const professions = await storage.getProfessions();
        const subjects = await storage.getSubjects();
        const modules = await storage.getModules();
        const users = await storage.getUsers();
        
        const backupData = {
            professions,
            subjects,
            modules,
            users,
            backupDate: new Date().toISOString(),
            version: '1.0'
        };

        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
        console.log(`[OK] Adatbázis mentve ide: ${backupPath}`);
        return backupPath;
    } catch (error) {
        console.error('[HIBA] Nem sikerült a mentés:', error);
        throw error;
    }
}

backupDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
