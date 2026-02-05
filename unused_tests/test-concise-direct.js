import { storage } from './server/storage.js';
import { enhancedModuleGenerator } from './server/enhanced-module-generator.js';

async function testConciseGeneration() {
    try {
        console.log('Testing concise generation directly...');
        
        // Get module 2
        const module = await storage.getModule(2);
        if (!module) {
            console.log('Module 2 not found');
            return;
        }
        
        console.log('Module title:', module.title);
        console.log('Has concise content:', !!module.conciseContent);
        console.log('Has detailed content:', !!module.detailedContent);
        
        if (!module.conciseContent && module.content) {
            console.log('Generating concise content...');
            
            // Generate enhanced content with concise version
            try {
                const enhanced = await enhancedModuleGenerator.generateEnhancedModule(
                    module.title,
                    module.content,
                    'Anyagismereti tananyag',
                    'Készíts tömör, gyakorlatias tananyagot'
                );
                
                console.log('Enhanced content generated successfully');
                console.log('Concise version length:', enhanced.conciseVersion?.length || 0);
                console.log('Detailed version length:', enhanced.detailedVersion?.length || 0);
                
                // Update module with concise content
                await storage.updateModule(module.id, {
                    conciseContent: enhanced.conciseVersion,
                    detailedContent: enhanced.detailedVersion || module.content,
                    keyConceptsData: enhanced.keyConceptsWithVideos
                });
                
                console.log('✓ Module updated with concise content');
                
                // Show preview of concise content
                if (enhanced.conciseVersion) {
                    console.log('\n--- Concise Content Preview ---');
                    console.log(enhanced.conciseVersion.substring(0, 300) + '...');
                }
                
            } catch (error) {
                console.error('Error generating enhanced content:', error.message);
            }
        } else {
            console.log('Module already has concise content or missing original content');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testConciseGeneration();