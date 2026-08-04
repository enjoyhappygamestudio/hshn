import { query, pool } from './db';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

async function seed() {
  // Run main seed SQL
  const seedPath = path.join(__dirname, '../../seeds/seed.sql');
  const sql = fs.readFileSync(seedPath, 'utf-8');

  try {
    console.log('Seeding database...');
    await query(sql);
    console.log('  ✓ Main seed done');

    // Seed admin users
    const adminHash = await bcrypt.hash('admin123', 12);
    const staffHash = await bcrypt.hash('staff123', 12);
    const invHash = await bcrypt.hash('inv123', 12);

    await query(`
      INSERT INTO admin_users (name, phone, email, password_hash, role) VALUES
        ($1, '0987654321', 'admin@meh.vn', $2, 'admin'),
        ($3, '0987654322', 'staff@meh.vn', $4, 'staff'),
        ($5, '0987654323', 'inventory@meh.vn', $6, 'inventory_staff')
      ON CONFLICT (phone) DO NOTHING
    `, ['Admin MEH', adminHash, 'Nhân viên A', staffHash, 'Kho B', invHash]);

    console.log('  ✓ Admin users seeded');
    console.log('Seed completed successfully.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
