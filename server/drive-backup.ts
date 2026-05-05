import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { storage } from './storage';
import crypto from 'crypto';

// Drive API beállítások
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const BACKUP_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID; // A megosztott mappa ID-ja

async function getDriveService() {
    // A kulcsot a .env-ben tárolt elérési útról olvassuk be
    const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: SCOPES,
    });
    return google.drive({ version: 'v3', auth });
}

async function generateDatabaseHash() {
    const modules = await storage.getModules();
    const data = JSON.stringify(modules);
    return crypto.createHash('md5').update(data).digest('hex');
}

export async function runSmartBackup() {
    console.log('[Backup] Okos mentés indítása...');

    try {
        // Dinamikus mappa ID lekérése (.env vagy adatbázis)
        let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) {
            const setting = await storage.getSystemSetting("GOOGLE_DRIVE_FOLDER_ID");
            folderId = setting?.value;
        }

        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS || !folderId) {
            console.warn('[Backup] Google Drive nincs konfigurálva (hiányzó Credentials vagy Folder ID). Mentés kihagyva.');
            return;
        }

        const drive = await getDriveService();
        const currentHash = await generateDatabaseHash();

        // 1. Ellenőrizzük az utolsó mentést (opcionális okos funkció)
        // Itt tárolhatnánk egy fájlban az utolsó sikeres hash-t
        
        // 2. Adatok összegyűjtése (ugyanaz a logika, mint a create-backup.ts-ben)
        const professions = await storage.getProfessions();
        const subjects = await storage.getSubjects();
        const modules = await storage.getModules();
        const users = await storage.getUsers();
        
        const backupData = {
            professions,
            subjects,
            modules,
            users,
            hash: currentHash,
            backupDate: new Date().toISOString()
        };

        const envPrefix = process.env.NODE_ENV === 'production' ? 'PROD' : 'TEST';
        const fileName = `${envPrefix}_autokobot_backup_${new Date().toISOString().split('T')[0]}.json`;
        const tempPath = path.join(process.cwd(), 'backups', fileName);


        if (!fs.existsSync(path.join(process.cwd(), 'backups'))) {
            fs.mkdirSync(path.join(process.cwd(), 'backups'));
        }

        fs.writeFileSync(tempPath, JSON.stringify(backupData, null, 2));

        // 3. Feltöltés a Drive-ra
        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };
        const media = {
            mimeType: 'application/json',
            body: fs.createReadStream(tempPath),
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
        });

        console.log(`[Backup] Sikeres feltöltés! Drive File ID: ${response.data.id}`);

        // 4. Takarítás (opcionális: töröljük a 30 napnál régebbi mentéseket a Drive-ról)
        await cleanupOldBackups(drive);

        // Ideiglenes fájl törlése
        fs.unlinkSync(tempPath);

    } catch (error) {
        console.error('[Backup] Hiba a mentés során:', error);
    }
}

async function cleanupOldBackups(drive: any) {
    // Itt listázhatjuk a fájlokat a mappában és törölhetjük a régieket
    // Ezt a részt akkor érdemes aktiválni, ha már látjuk a fájlok formátumát
}
