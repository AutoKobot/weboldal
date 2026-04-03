import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

// A kliens példányosítása, ha vannak kulcsok
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Központi Supabase Storage feltöltő függvény aszinkron média kezeléshez.
 * Célja, hogy a szerver fájlrendszerét tehermentesítse, és biztosítsa a 
 * feltöltött hangok és képek végleges megőrzését (akár GitHub deploy után is).
 *
 * @param bucketName Supabase tárhely neve (pl. "presentations")
 * @param filePath Fájl relatív útvonala a vödrön belül (pl. "modul3/audio.mp3")
 * @param fileBuffer A fájl nyers bájt adathalmaza
 * @param contentType A feltöltendő fájl MIME típusa (pl. "audio/mpeg" vagy "image/png")
 * @returns A publikusan elérhető URL cím vagy hiba esetén null
 */
export async function uploadToSupabase(
  bucketName: string, 
  filePath: string, 
  fileBuffer: Buffer, 
  contentType: string
): Promise<string | null> {
  if (!supabase) {
    console.error("Supabase Storage Error: Hiányoznak a .env konfigurációs kulcsok!");
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true // Felülírja, ha ugyanazzal a névvel már létezik
      });
      
    if (error) {
      console.error(`Supabase Upload Failed (${filePath}):`, error.message);
      return null;
    }
    
    // Sikeres feltöltés esetén generálunk egy garantáltan publikus és elpusztíthatatlan URL-t
    const { data: { publicUrl } } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(filePath);
      
    return publicUrl;
  } catch (err) {
    console.error("Supabase Unexpected Context Error:", err);
    return null;
  }
}
