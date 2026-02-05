// Test AI regeneration with bold linking through API call
async function testAIRegenerationComplete() {
  console.log('=== TESTING AI REGENERATION WITH BOLD LINKING ===\n');
  
  try {
    // Make API call to trigger AI regeneration on module 42 with session cookie
    const response = await fetch('http://localhost:5000/api/admin/modules/42/regenerate-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3AhCqWJYbK8XPuS3tQKBwDzqAnXvV5l_Kt.MF3iLhxV7S0AuFRdJ0N98yZ3VqQmTpHi5C8oL2XgEuA'
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('AI regeneration response:', result);
      
      if (result.success) {
        console.log('✅ AI regeneration initiated successfully');
        console.log('Queue status:', result.queueStatus);
      } else {
        console.log('❌ AI regeneration failed:', result.message);
      }
    } else {
      console.log('Response status:', response.status);
      const text = await response.text();
      console.log('Response text:', text);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testAIRegenerationComplete();