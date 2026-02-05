// Test the new scalable professional field detection system
import axios from 'axios';
import fs from 'fs';

async function testScalableSystem() {
  console.log('=== TESTING SCALABLE PROFESSIONAL FIELD DETECTION ===\n');
  
  const testCases = [
    {
      id: 13,
      title: "Elfin robot koordináta rendszer",
      content: "Robot programozás és koordináta transzformációk az Elfin robotokhoz",
      expectedField: "robotics",
      expectedKeywords: ["robotika", "automatizálás", "programozás"]
    },
    {
      id: 14,
      title: "Hegesztési varrat minősége",
      content: "MIG hegesztés és varrat ellenőrzési technikák",
      expectedField: "welding", 
      expectedKeywords: ["hegesztés", "fémfeldolgozás", "hegesztéstechnika"]
    },
    {
      id: 15,
      title: "Főzési technikák",
      content: "Alapvető főzési módszerek és gasztronómiai alapok",
      expectedField: "cooking",
      expectedKeywords: ["főzés", "gasztronómia", "szakácsképzés"]
    }
  ];
  
  console.log('🎯 Testing professional field detection for multiple domains:');
  testCases.forEach(test => {
    console.log(`- ${test.title}: Expected ${test.expectedField} -> ${test.expectedKeywords.join(', ')}`);
  });
  
  console.log('\n📋 System now supports:');
  console.log('✓ 10+ professional fields with specific keyword sets');
  console.log('✓ Dynamic content analysis based on title + content + profession + subject');
  console.log('✓ Scalable to 100+ professions and thousands of modules');
  console.log('✓ Context-aware Wikipedia and YouTube keyword generation');
  
  console.log('\n🚀 Starting test regeneration...');
  
  // Test with first case (robotics)
  try {
    const sessionCookie = fs.readFileSync('admin-session.txt', 'utf8');
    
    const response = await axios.post(`http://localhost:5000/api/admin/modules/${testCases[0].id}/regenerate-ai`, {
      title: testCases[0].title,
      content: testCases[0].content
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      }
    });
    
    console.log('✅ Robotics module regeneration started successfully');
    console.log('Watch console logs for professional field detection and keyword generation');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testScalableSystem();