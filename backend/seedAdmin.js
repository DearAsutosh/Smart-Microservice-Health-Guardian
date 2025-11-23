import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/health-guardian';

// Default admin credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@healthguardian.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function seedAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    
    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      process.exit(0);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // Create admin user
    const admin = await User.create({
      email: ADMIN_EMAIL,
      passwordHash
    });

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n⚠️  Please change the default password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    process.exit(1);
  }
}

seedAdmin();
