import { enhancedModuleGenerator } from './server/enhanced-module-generator.js';

async function testBoldLinkingDirect() {
  console.log('=== TESTING BOLD LINKING DIRECTLY ===\n');
  
  // Test content with bold words
  const testContent = `
# Test Module

Ez egy teszt modul a **robotok** és **automatizálás** témájában.

A **programozás** kulcsfontosságú a modern **gépészet** területén.

További témák:
- **karbantartás**
- **biztonsági** előírások
- **szoftver** fejlesztés
`;

  const testTitle = "Robotika alapok";
  const testField = "robotics";
  
  try {
    console.log('Original content:');
    console.log(testContent);
    console.log('\n--- Starting web search integration ---\n');
    
    const enhancedContent = await enhancedModuleGenerator.addWebSearchContent(
      testContent, 
      testTitle, 
      testField
    );
    
    console.log('\n--- Final enhanced content ---\n');
    console.log(enhancedContent);
    
    // Check if bold linking occurred
    const hasLinkedBold = enhancedContent.includes('**[') && enhancedContent.includes('](http');
    console.log(`\n✅ Bold linking success: ${hasLinkedBold}`);
    
    if (hasLinkedBold) {
      const linkedWords = enhancedContent.match(/\*\*\[([^\]]+)\]\([^)]+\)\*\*/g);
      console.log(`🔗 Linked bold words: ${linkedWords ? linkedWords.length : 0}`);
      if (linkedWords) {
        linkedWords.forEach(link => console.log(`  - ${link}`));
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testBoldLinkingDirect();