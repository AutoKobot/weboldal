import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Hiba: Hiányoznak a Supabase kulcsok a .env fájlból!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFiles() {
  console.log('🔍 Csatlakozás a Supabase-hez...');
  
  // A "presentations" bucket lekérdezése
  const { data, error } = await supabase.storage.from('presentations').list(undefined, {
    limit: 50,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (error) {
    console.error('❌ Hiba történt a fájlok lekérdezésekor:', error.message);
    return;
  }
  
  console.log(`\n📂 Talált fájlok száma a 'presentations' bucketben: ${data?.length || 0}`);
  
  if (data && data.length > 0) {
    console.log('\n📄 Legutóbbi fájlok:');
    data.slice(0, 15).forEach(file => {
      // Csak az igazi fájlokat írjuk ki (a mappáknak nincs mérete)
      if (file.id) {
          const sizeKb = Math.round(file.metadata?.size / 1024);
          const date = new Date(file.created_at).toLocaleString('hu-HU');
          console.log(`- ${file.name} (${sizeKb} KB) | ${date}`);
      }
    });
  } else {
    console.log('\nA bucket üres, vagy nem töltődtek fel hangfájlok.');
  }
}

checkFiles();
