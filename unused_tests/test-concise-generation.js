import axios from 'axios';

async function testConciseGeneration() {
    try {
        console.log('Testing concise content generation for module ID 2...');
        
        // Test the AI regeneration endpoint for module 2
        const response = await axios.post('http://localhost:5000/api/admin/modules/2/regenerate-ai', {}, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'admin-session=admin-borga'
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
        
        if (response.data.success) {
            console.log('✓ AI regeneration initiated successfully');
            console.log('Module ID:', response.data.moduleId);
            
            // Wait a bit and check the module content
            setTimeout(async () => {
                try {
                    const moduleResponse = await axios.get('http://localhost:5000/api/modules/2', {
                        headers: {
                            'Cookie': 'admin-session=admin-borga'
                        }
                    });
                    
                    const module = moduleResponse.data;
                    console.log('\n--- Module after regeneration ---');
                    console.log('Has concise content:', !!module.concise_content);
                    console.log('Has detailed content:', !!module.detailed_content);
                    
                    if (module.concise_content) {
                        console.log('\n--- Concise Content Preview ---');
                        console.log(module.concise_content.substring(0, 300) + '...');
                    }
                    
                } catch (error) {
                    console.error('Error checking module:', error.response?.data || error.message);
                }
            }, 10000); // Wait 10 seconds
            
        } else {
            console.log('❌ AI regeneration failed');
        }
        
    } catch (error) {
        console.error('Error testing concise generation:', error.response?.data || error.message);
    }
}

testConciseGeneration();