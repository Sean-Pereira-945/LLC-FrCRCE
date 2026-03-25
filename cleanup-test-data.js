/**
 * cleanup-test-data.js
 * Removes all users whose name or email contains "test" (case-insensitive),
 * plus all data they own (courses, enrollments, etc.) via ON DELETE CASCADE.
 *
 * Run: node cleanup-test-data.js
 */
require('dotenv').config();
const pool = require('./db/pool');

async function cleanup() {
  const client = await pool.connect();
  try {
    // 1. Preview what will be deleted
    const preview = await client.query(`
      SELECT id, name, email, user_type
      FROM users
      WHERE lower(name) LIKE '%test%' OR lower(email) LIKE '%test%'
      ORDER BY id;
    `);

    if (preview.rows.length === 0) {
      console.log('No test users found. Nothing to delete.');
      return;
    }

    console.log('\n=== Users to be deleted ===');
    preview.rows.forEach(u =>
      console.log(`  [${u.id}] ${u.name} <${u.email}> (${u.user_type})`)
    );

    const ids = preview.rows.map(u => u.id);

    await client.query('BEGIN');

    // 2. Delete courses created by test teachers (cascades to modules, materials,
    //    announcements, assignments, module_comments, enrollments)
    const courses = await client.query(
      'DELETE FROM courses WHERE teacher_id = ANY($1::int[]) RETURNING id, name',
      [ids]
    );
    if (courses.rows.length > 0) {
      console.log('\n=== Courses deleted ===');
      courses.rows.forEach(c => console.log(`  [${c.id}] ${c.name}`));
    }

    // 3. Delete enrollments where the student is a test user
    await client.query(
      'DELETE FROM enrollments WHERE student_id = ANY($1::int[])',
      [ids]
    );

    // 4. Delete module comments posted by test users
    await client.query(
      'DELETE FROM module_comments WHERE user_id = ANY($1::int[])',
      [ids]
    );

    // 5. Finally delete the test users themselves
    await client.query(
      'DELETE FROM users WHERE id = ANY($1::int[])',
      [ids]
    );

    await client.query('COMMIT');
    console.log(`\n✅ Successfully deleted ${preview.rows.length} test user(s) and all their data.\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Cleanup failed:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

cleanup();
