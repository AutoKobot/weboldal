import axios from 'axios';
import fs from 'fs';

async function testWikipediaFix() {
  console.log('Testing Wikipedia links generation after fixing limits...');
  
  try {
    // Test with a complex technical content that should generate many Wikipedia links
    const testContent = `
    Az ipari robotika fejlesztése során számos kulcsfontosságú technológiai elemmel találkozunk. 
    A mechanika, elektronika, programozás, automatizálás, szenzortechnika, mesterséges intelligencia, 
    gépi látás, pneumatika, hidraulika, szervohajtások, PLC vezérlők, CNC gépek, CAD/CAM rendszerek,
    gyártástechnológia, minőségbiztosítás, biztonságtechnika, ergonómia, munkavédelem, karbantartás,
    diagnosztika, robotprogramozás, path planning, kinematika, dinamika, szabályozástechnika,
    folyamatautomatizálás, ipari kommunikáció, fieldbus rendszerek, SCADA, MES rendszerek,
    cyber-physical systems, Industry 4.0, IoT, big data, machine learning, deep learning,
    computer vision, collaborative robotics, human-robot interaction mind-mind fontos szerepet játszanak.
    `;
    
    const response = await axios.post('http://localhost:5000/api/admin/modules/test-module/regenerate-ai', {
      title: 'Test Wikipedia Links Generation',
      content: testContent,
      subjectId: 1
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': fs.readFileSync('admin-cookies.txt', 'utf8')
      }
    });

    if (response.data.success && response.data.module) {
      const keyConceptsData = response.data.module.keyConceptsData;
      
      console.log(`✅ Module generated with ${keyConceptsData.length} key concepts`);
      
      let totalWikipediaLinks = 0;
      keyConceptsData.forEach((concept, index) => {
        const wikiCount = concept.wikipediaLinks ? concept.wikipediaLinks.length : 0;
        totalWikipediaLinks += wikiCount;
        console.log(`Concept ${index + 1}: "${concept.concept}" - ${wikiCount} Wikipedia links`);
      });
      
      console.log(`\n📊 Total Wikipedia links generated: ${totalWikipediaLinks}`);
      
      if (totalWikipediaLinks > 10) {
        console.log('✅ SUCCESS: Wikipedia links generation is working properly!');
        console.log('The 10-keyword limit has been successfully removed.');
      } else {
        console.log('⚠️  Warning: Still seems limited to few Wikipedia links');
      }
      
    } else {
      console.log('❌ Failed to generate test module');
    }
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testWikipediaFix();