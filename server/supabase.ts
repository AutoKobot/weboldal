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
    const url = (dbUrl && dbUrl !== 'undefined') ? dbUrl : (process.env.SUPABASE_URL || '');
    const key = (dbKey && dbKey !== 'undefined') ? dbKey : (process.env.SUPABASE_ANON_KEY || '');
    
    // Ha a kulcsok nem változtak és már van példány, adjuk vissza azt
    if (supabaseInstance && url === lastUsedUrl && key === lastUsedKey) {
      return supabaseInstance;
    }
    
    // Ha nincsenek kulcsok, nem tudunk klienst létrehozni
    if (!url || !key) {
      console.warn("[SUPABASE] Configuration Missing: No URL or Key found in DB or ENV.");
      return null;
    }
    
    // Új kliens létrehozása
    console.log(`[SUPABASE] Initializing client with URL: ${url.substring(0, 25)}...`);
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
  } catch (err) {
    console.error("[SUPABASE] Unexpected context error during upload:", err);
    return null;
  }
}

// Régebbi kódrészek miatt exportálunk egy (kezdetben null) supabase változót is, 
// de bátorítjuk az uploadToSupabase használatát.
export const supabase = null; 
