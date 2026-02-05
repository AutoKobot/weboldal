// Final test of YouTube keyword generation fix
async function testFinalYouTubeFix() {
  console.log('=== FINAL YOUTUBE KEYWORD TEST ===\n');
  
  const response = await fetch('http://localhost:5000/api/admin/modules/14/regenerate-ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': require('fs').readFileSync('admin-session.txt', 'utf8')
    },
    body: JSON.stringify({
      title: 'Elfin robot kinematika',
      content: 'Robot koordináta rendszer és Elfin robot programozási alapok'
    })
  });
  
  console.log('Robot module regeneration started');
  console.log('Expected YouTube terms: robotika, automatizálás, programozás');
  console.log('Should NOT contain: metallurgia, anyagtudomány, hegesztéstechnika');
}

testFinalYouTubeFix().catch(console.error);