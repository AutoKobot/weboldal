import { createClient } from '@supabase/supabase-js';

// Cache for the supabase client instance
let supabaseInstance: any = null;
let lastUsedUrl = "";
let lastUsedKey = "";

/**
 * Dinamikusan lekéri a Supabase klienst, prioritást adva az adatbázisban tárolt beállításoknak.
 * Ez biztosítja, hogy ha a felhasználó az Admin felületen frissíti a kulcsokat, 
 * a rendszer újraalkalmazza azokat restart nélkül is.
 */
async function getSupabaseClient() {
  try {
    const { storage } = await import("./storage");
    
    // 1. Megpróbáljuk az adatbázisból (system_settings tábla)
    const dbUrlSetting = await storage.getSystemSetting("SUPABASE_URL");
    const dbKeySetting = await storage.getSystemSetting("SUPABASE_ANON_KEY");
    
    const dbUrl = dbUrlSetting?.value;
    const dbKey = dbKeySetting?.value;
    
    // 2. Fallback a környezeti változókra
    const url = (dbUrl && dbUrl.trim() !== '' && dbUrl !== 'undefined') ? dbUrl : (process.env.SUPABASE_URL || '');
    const key = (dbKey && dbKey.trim() !== '' && dbKey !== 'undefined') ? dbKey : (process.env.SUPABASE_ANON_KEY || '');
    
    // Ha a kulcsok nem változtak és már van példány, adjuk vissza azt
    if (supabaseInstance && url === lastUsedUrl && key === lastUsedKey) {
      return supabaseInstance;
    }
    
    // Ha nincsenek kulcsok, nem tudunk klienst létrehozni
    if (!url || !key) {
      console.warn("[SUPABASE] Configuration Missing: No URL or Key found in DB or ENV.");
      return null;
    }

    if (!url.startsWith('http')) {
      console.error("[SUPABASE] Invalid URL format in configuration:", url);
      return null;
    }
    
    // Új kliens létrehozása
    const source = (dbUrl && dbUrl.trim() !== '') ? "Database" : "Environment (.env)";
    console.log(`[SUPABASE] Initializing client from ${source} with URL: ${url.substring(0, 25)}...`);
    lastUsedUrl = url;
    lastUsedKey = key;
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  } catch (error) {

    console.error("[SUPABASE] Error initializing dynamic client:", error);
    // Végső fallback: ha az import/DB nem megy, próbáljuk csak ENV-ből (szinkron módon)
    const envUrl = process.env.SUPABASE_URL || '';
    const envKey = process.env.SUPABASE_ANON_KEY || '';
    if (envUrl && envKey) {
       return createClient(envUrl, envKey);
    }
    return null;
  }
}

/**
 * Megbizonyosodik róla, hogy a megadott bucket létezik, és ha nem, létrehozza.
 */
async function ensureBucketExists(supabase: any, bucketName: string) {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error("[SUPABASE] Error listing buckets:", error.message);
      return;
    }
    
    const exists = buckets.find((b: any) => b.name === bucketName);
    if (!exists) {
      console.log(`[SUPABASE] Creating missing bucket: ${bucketName}`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 52428800 // 50MB
      });
      if (createError) {
        console.error(`[SUPABASE] Failed to create bucket ${bucketName}:`, createError.message);
      } else {
        console.log(`[SUPABASE] Bucket ${bucketName} created successfully (public)`);
      }
    }
  } catch (err) {
    console.error("[SUPABASE] Unexpected error during bucket check:", err);
  }
}

/**
 * Központi Supabase Storage feltöltő függvény aszinkron média kezeléshez.
 */
export async function uploadToSupabase(
  bucketName: string, 
  filePath: string, 
  fileBuffer: Buffer, 
  contentType: string
): Promise<string | null> {
  const supabase = await getSupabaseClient();
  
  if (!supabase) {
    console.error("[SUPABASE] Storage Error: Hiányoznak a konfigurációs kulcsok!");
    return null;
  }
  
  try {
    // Ellenőrizzük a bucket létezését feltöltés előtt
    await ensureBucketExists(supabase, bucketName);

    console.log(`[SUPABASE] Uploading ${filePath} to bucket ${bucketName}...`);
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true
      });
      
    if (error) {
      console.error(`[SUPABASE] Upload Failed (${filePath}):`, error.message);
      if (error.message.includes("not found") || error.message.includes("bucket")) {
         console.error(`[SUPABASE] IMPORTANT: Bucket '${bucketName}' does not exist or is not public!`);
      }
      return null;
    }
    
    // Sikeres feltöltés esetén generálunk egy publikus URL-t
    const { data: { publicUrl } } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(filePath);
      
    console.log(`[SUPABASE] Upload Success! Public URL: ${publicUrl}`);
    return publicUrl;
  } catch (err: any) {
    console.error("[SUPABASE] Unexpected context error during upload:", err?.message || err);
    return null;
  }
}

/**
 * Törli egy adott modul összes korábbi médiafájlját a tárolóból generálás előtt.
 */
export async function cleanupModuleStorage(moduleId: number): Promise<void> {
  const supabase = await getSupabaseClient();
  if (!supabase) return;

  try {
    const folder = `module_${moduleId}`;
    console.log(`[SUPABASE] Cleaning up storage for module ${moduleId}...`);

    // 1. Kilistázunk minden fájlt a modul mappájában
    const { data: files, error: listError } = await (supabase as any)
      .storage
      .from("presentations")
      .list(folder);

    if (listError) {
      console.warn(`[SUPABASE] Cleanup list warning for ${folder}:`, listError.message);
      return;
    }

    if (files && files.length > 0) {
      const filesToDelete = files.map((f: any) => `${folder}/${f.name}`);
      console.log(`[SUPABASE] Deleting ${filesToDelete.length} stale files for module ${moduleId}...`);
      
      const { error: deleteError } = await (supabase as any)
        .storage
        .from("presentations")
        .remove(filesToDelete);

      if (deleteError) {
        console.error(`[SUPABASE] Cleanup delete error for ${folder}:`, deleteError.message);
      } else {
        console.log(`[SUPABASE] Cleanup successful for ${folder}.`);
      }
    }
  } catch (error) {
    console.error(`[SUPABASE] Error during cleanup for module ${moduleId}:`, error);
  }
}

// Régebbi kódrészek miatt exportálunk egy (kezdetben null) supabase változót is, 
// de bátorítjuk az uploadToSupabase használatát.
export const supabase = null; 
