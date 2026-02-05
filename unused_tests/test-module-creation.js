import axios from 'axios';

async function testModuleCreation() {
    try {
        console.log('Creating test module with concise/detailed content generation...');
        
        // Login as admin first
        const loginResponse = await axios.post('http://localhost:5000/api/admin/login', {
            username: 'Borga',
            password: 'Borga'
        });
        
        console.log('Admin login successful');
        
        // Create new test module
        const moduleData = {
            title: 'Tesztelési anyag',
            content: 'Ez egy rövid teszt tartalom a tömör verzió generálásához. Tartalmaz alapvető információkat.',
            moduleNumber: 99,
            subjectId: 1
        };
        
        const createResponse = await axios.post('http://localhost:5000/api/admin/modules/create-enhanced', moduleData, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': loginResponse.headers['set-cookie']?.join('; ')
            }
        });
        
        console.log('Module creation status:', createResponse.status);
        console.log('Created module:', createResponse.data);
        
        if (createResponse.data.id) {
            const moduleId = createResponse.data.id;
            console.log('New module ID:', moduleId);
            
            // Check if concise and detailed versions are different
            const module = createResponse.data;
            console.log('Has concise content:', !!module.conciseContent);
            console.log('Has detailed content:', !!module.detailedContent);
            
            if (module.conciseContent && module.detailedContent) {
                console.log('Concise length:', module.conciseContent.length);
                console.log('Detailed length:', module.detailedContent.length);
                console.log('Are they different?', module.conciseContent !== module.detailedContent);
            }
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testModuleCreation();