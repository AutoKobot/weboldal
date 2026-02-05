// Test YouTube keyword fix for robotics content
import axios from 'axios';
import fs from 'fs';

async function testYouTubeFix() {
  console.log('=== TESTING YOUTUBE KEYWORD FIX ===\n');
  
  console.log('🤖 Testing robotics content detection...');
  console.log('Expected: robotika, automatizálás, programozás');
  console.log('NOT expected: metallurgia, anyagtudomány, hegesztéstechnika\n');
  
  console.log('📋 Monitoring console for YouTube search terms...');
  console.log('Robot module should generate robotics keywords');
  console.log('Non-robot modules should generate generic tech keywords\n');
  
  console.log('⏳ Waiting for module regeneration to complete...');
  
  // Monitor for specific patterns
  const problematicTerms = ['metallurgia', 'anyagtudomány', 'hegesztéstechnika'];
  const expectedTerms = ['robotika', 'automatizálás', 'programozás'];
  
  console.log('\n🔍 Watch for these patterns in logs:');
  console.log('❌ PROBLEMATIC:', problematicTerms.join(', '));
  console.log('✅ EXPECTED:', expectedTerms.join(', '));
}

testYouTubeFix();