import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { storage } from './storage';
import crypto from 'crypto';

// Drive API beállítások
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const BACKUP_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID; // A megosztott mappa ID-ja

function getGoogleCredentials() {
    const credsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credsEnv) return null;

    // 1. Ha közvetlenül egy JSON string (pl. Railway config var)
    if (credsEnv.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(credsEnv);
            return { credentials: parsed };
        } catch (e) {
            console.error('[Backup] GOOGLE_APPLICATION_CREDENTIALS JSON parszolása sikertelen:', e);
            return null;
        }
    }

    // 2. Ha fájl elérési út
    try {
        if (fs.existsSync(credsEnv)) {
            const fileContent = fs.readFileSync(credsEnv, 'utf8');
            JSON.parse(fileContent); // Validáljuk, hogy érvényes JSON-e
            return { keyFile: credsEnv };
        }
    } catch (e) {
        console.error('[Backup] GOOGLE_APPLICATION_CREDENTIALS fájl olvasása/parszolása sikertelen:', e);
        return null;
    }

    return null;
}

async function getDriveService(config: { credentials?: any; keyFile?: string }) {
    const auth = new google.auth.GoogleAuth({
        ...config,
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
        const currentHash = await generateDatabaseHash();

        // 1. Adatok összegyűjtése – csak metaadatok, nehéz tartalom (content, presentationData stb.) nélkül
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
        console.log(`[Backup] Helyi mentés sikeresen elmentve ide: ${tempPath}`);

        // Google Drive konfiguráció ellenőrzése
        const googleConfig = getGoogleCredentials();
        
        let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) {
            const setting = await storage.getSystemSetting("GOOGLE_DRIVE_FOLDER_ID");
            folderId = setting?.value ?? undefined;
        }

        if (!googleConfig || !folderId) {
            console.log('[Backup] Google Drive nincs konfigurálva vagy a hitelesítés érvénytelen. Csak helyi mentést készítünk.');
            return {
                success: true,
                status: 'local_only',
                message: 'Google Drive hitelesítés hiányzik vagy érvénytelen. Helyi mentés sikeresen elkészítve.',
                fileName: fileName,
                hash: currentHash
            };
        }

        // Ha van Google kulcs és mappa ID, megkíséreljük a feltöltést
        try {
            console.log('[Backup] Google Drive feltöltés megkísérlése...');
            const drive = await getDriveService(googleConfig);
            
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

            console.log(`[Backup] Sikeres Google Drive feltöltés! Drive File ID: ${response.data.id}`);

            // Takarítás (opcionális: töröljük a 30 napnál régebbi mentéseket a Drive-ról)
            await cleanupOldBackups(drive);

            // Ha sikeres volt a Drive feltöltés, akkor töröljük a helyi ideiglenes fájlt,
            // hogy ne foglalja a helyet a szerveren (ha a Drive a fő tároló)
            fs.unlinkSync(tempPath);

            return {
                success: true,
                status: 'drive',
                fileId: response.data.id,
                fileName: fileName,
                hash: currentHash
            };
        } catch (driveError: any) {
            console.error('[Backup] Hiba a Google Drive feltöltés során, de a helyi mentés megmaradt:', driveError);
            return {
                success: true,
                status: 'local_fallback',
                warning: 'Google Drive feltöltési hiba, de a helyi mentés megmaradt.',
                error: driveError.message,
                fileName: fileName,
                hash: currentHash
            };
        }

    } catch (error: any) {
        console.error('[Backup] Kritikus hiba a mentés során:', error);
        return {
            success: false,
            status: 'failed',
            error: error.message || String(error)
        };
    }
}

async function cleanupOldBackups(drive: any) {
    // Itt listázhatjuk a fájlokat a mappában és törölhetjük a régieket
    // Ezt a részt akkor érdemes aktiválni, ha már látjuk a fájlok formátumát
}
