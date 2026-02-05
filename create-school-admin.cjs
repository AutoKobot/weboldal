const { hashPassword } = require('./server/localAuth');
const { db } = require('./server/db');
const { users } = require('./shared/schema');
const { eq } = require('drizzle-orm');

async function createSchoolAdmin() {
  try {
    // Hash the password properly
    const hashedPassword = await hashPassword('password');
    
    // Check if user exists, delete if it does
    await db.delete(users).where(eq(users.username, 'iskolaadmin'));
    
    // Create new school admin user
    const [user] = await db.insert(users).values({
      id: 'school-admin-1',
      username: 'iskolaadmin',
      password: hashedPassword,
      role: 'school_admin',
      authType: 'local',
      firstName: 'Iskola',
      lastName: 'Admin',
      email: 'admin@iskola.hu'
    }).returning();
    
    console.log('School admin user created successfully:', user);
    console.log('Login credentials:');
    console.log('Username: iskolaadmin');
    console.log('Password: password');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating school admin:', error);
    process.exit(1);
  }
}

createSchoolAdmin();