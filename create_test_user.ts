
import { storage } from './server/storage';
import { hashPassword } from './server/localAuth';

async function createTestUser() {
    const username = 'testuser99';
    const plainPassword = 'password123';

    try {
        console.log(`Checking if user '${username}' exists...`);
        const existingUser = await storage.getUserByUsername(username);

        if (existingUser) {
            console.log(`User '${username}' already exists. ID: ${existingUser.id}`);
            process.exit(0);
        }

        console.log(`Creating user '${username}'...`);
        const hashedPassword = await hashPassword(plainPassword);
        const userId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const newUser = await storage.createLocalUser({
            id: userId,
            username: username,
            password: hashedPassword,
            email: 'testuser99@example.com',
            firstName: 'Test',
            lastName: 'User',
            authType: 'local',
            role: 'student'
        });

        console.log(`Successfully created user '${username}'. ID: ${newUser.id}`);
        process.exit(0);

    } catch (error) {
        console.error('Error creating test user:', error);
        process.exit(1);
    }
}

createTestUser();
