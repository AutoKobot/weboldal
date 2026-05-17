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
    // Only fetch lightweight module list for hash (avoid loading huge content/media fields)
    const modules = await storage.getModules();
    // Use only IDs and updatedAt for a stable, memory-efficient hash
    const data = JSON.stringify(modules.map((m: any) => ({ id: m.id, updatedAt: m.updatedAt })));
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

        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            throw new Error('Google Drive hitelesítési fájl nincs megadva (GOOGLE_APPLICATION_CREDENTIALS .env változó hiányzik)');
        }
        if (!folderId) {
            throw new Error('Google Drive célmappa azonosító nincs megadva (GOOGLE_DRIVE_FOLDER_ID hiányzik)');
        }

        const drive = await getDriveService();
        const currentHash = await generateDatabaseHash();

        // 2. Adatok összegyűjtése – csak metaadatok, nehéz tartalom (content, presentationData stb.) nélkül
        const professions = await storage.getProfessions();
        const subjects = await storage.getSubjects();
        // Moduloknál csak strukturális mezők – a content/media mezők rengeteg RAM-ot foglalnának
        const allModules = await storage.getModules();
        const modules = allModules.map((m: any) => ({
            id: m.id,
            subjectId: m.subjectId,
            title: m.title,
            isPublished: m.isPublished,
            order: m.order,
            type: m.type,
            suggestedHours: m.suggestedHours,
            updatedAt: m.updatedAt,
        }));
        // Felhasználóknál nem mentjük a password hash-t és a completedModules tömböt
        const allUsers = await storage.getAllUsers();
        const users = allUsers.map((u: any) => ({
            id: u.id,
            username: u.username,
            role: u.role,
            email: u.email,
            schoolId: u.schoolId,
            classId: u.classId,
            createdAt: u.createdAt,
        }));
        
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

        return {
            success: true,
            fileId: response.data.id,
            fileName: fileName,
            hash: currentHash
        };

    } catch (error: any) {
        console.error('[Backup] Hiba a mentés során:', error);
        throw error;
    }
}

async function cleanupOldBackups(drive: any) {
    // Itt listázhatjuk a fájlokat a mappában és törölhetjük a régieket
    // Ezt a részt akkor érdemes aktiválni, ha már látjuk a fájlok formátumát
}
