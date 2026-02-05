import { generateChatResponse } from './server/openai.js';

async function fixModule2Concise() {
    try {
        console.log('Generating proper concise content for module 2...');
        
        const originalContent = `Szia! 👋 Nagyon örülök, hogy a szennyezőelemekről szeretnél többet megtudni az acélgyártásban! Ez egy kulcsfontosságú téma, hiszen ezek az elemek jelentősen befolyásolhatják az acél végső tulajdonságait és minőségét.`;
        
        const concisePrompt = `Készíts tömör, lényegre törő tananyagot a következő címhez: Szennyező elemek. 

Alapanyag: Az acélgyártás során a nyersanyagokból vagy a gyártási folyamatból származó szennyezőelemek jelenléte jelentős hatással lehet az acél minőségére.

Követelmények: 
- Maximum 300-400 szó
- Csak a legfontosabb információk
- Egyszerű nyelvezet
- Markdown formázás
- Magyar nyelv
- Szakmai tartalom az acél szennyezőelemeikről

Válasz csak a formázott tartalommal:`;

        const response = await generateChatResponse(concisePrompt, 'chat');
        const conciseContent = response.message.trim();
        
        console.log('Generated concise content length:', conciseContent.length);
        console.log('Concise content preview:', conciseContent.substring(0, 200) + '...');
        
        // Here you would update the database
        console.log('Concise content generated successfully');
        console.log('Full content:', conciseContent);
        
    } catch (error) {
        console.error('Error generating concise content:', error.message);
    }
}

fixModule2Concise();