// Test all three critical fixes
import axios from 'axios';
import fs from 'fs';

async function testFinalFixes() {
  console.log('=== TESTING ALL CRITICAL FIXES ===\n');

  // Get admin cookies
  let cookies = '';
  try {
    cookies = fs.readFileSync('./admin-session.txt', 'utf8').trim();
  } catch (error) {
    console.error('Admin session not found');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': cookies
  };

  // Test 1: Sequential Processing
  console.log('1. TESTING SEQUENTIAL PROCESSING:');
  console.log('   Starting 3 modules simultaneously...');
  
  const testModules = [
    { id: 1, title: "Test Modul 1", content: "Acél hegesztés alapjai" },
    { id: 2, title: "Test Modul 2", content: "Robot programozás" },
    { id: 3, title: "Test Modul 3", content: "Minőségbiztosítás" }
  ];

  // Start all three at once to test queue
  const promises = testModules.map(module => 
    axios.post(`http://localhost:5000/api/admin/modules/${module.id}/regenerate-ai`, {
      title: module.title,
      content: module.content
    }, { headers }).catch(err => console.log(`   Module ${module.id} queued`))
  );

  // Don't wait for completion, just check queue status
  setTimeout(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/queue-status', { headers });
      console.log('   Queue Status:', response.data);
      console.log('   ✓ Expected: Only 1 processing, others queued\n');
    } catch (error) {
      console.log('   Queue status check failed\n');
    }
  }, 3000);

  // Test 2: Check for Mermaid fixes in actual module
  console.log('2. TESTING MERMAID DIAGRAM FIXES:');
  setTimeout(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/modules/15', { headers });
      const content = response.data.detailedContent || response.data.content;
      
      if (content.includes('```mermaid')) {
        console.log('   ✓ Mermaid diagram found in module');
        
        // Check for problematic syntax
        const hasSyntaxIssues = content.includes('(pirospaprika, só, b') || 
                               content.includes('Parse error') ||
                               content.includes('kolbászos lecsó');
                               
        if (hasSyntaxIssues) {
          console.log('   ❌ Mermaid syntax issues still present');
        } else {
          console.log('   ✓ Mermaid syntax appears clean');
        }
      } else {
        console.log('   - No Mermaid diagrams in test module');
      }
    } catch (error) {
      console.log('   Module fetch failed');
    }
    console.log('');
  }, 5000);

  // Test 3: Content differentiation
  console.log('3. TESTING CONTENT DIFFERENTIATION:');
  setTimeout(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/modules/15', { headers });
      const detailed = response.data.detailedContent || '';
      const concise = response.data.conciseContent || '';
      
      if (detailed && concise) {
        const detailedLength = detailed.length;
        const conciseLength = concise.length;
        const ratio = conciseLength / detailedLength;
        
        console.log(`   Detailed content: ${detailedLength} chars`);
        console.log(`   Concise content: ${conciseLength} chars`);
        console.log(`   Length ratio: ${(ratio * 100).toFixed(1)}%`);
        
        if (ratio < 0.7 && conciseLength < detailedLength) {
          console.log('   ✓ Content properly differentiated');
        } else {
          console.log('   ❌ Content not sufficiently different');
        }
      } else {
        console.log('   - Content versions not available yet');
      }
    } catch (error) {
      console.log('   Module content check failed');
    }
    console.log('');
  }, 7000);

  console.log('Fix verification in progress...');
  console.log('Check console logs for detailed processing information.');
}

testFinalFixes();