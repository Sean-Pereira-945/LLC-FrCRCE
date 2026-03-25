/**
 * Database migration — creates tables if they don't exist.
 * Called once on server startup.
 */
const pool = require('./pool');

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'teacher')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        schedule VARCHAR(255) NOT NULL,
        capacity INTEGER NOT NULL,
        category VARCHAR(50) NOT NULL CHECK (category IN ('Technical', 'Non-technical', 'Self-Development', 'Extra-curricular')),
        logo TEXT,
        syllabus_path TEXT NOT NULL,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        enrolled_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(student_id, course_id)
      );
    `);

    try {
      await client.query(`ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'`);
    } catch(e) {}


    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        ip_address VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_type VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        due_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS module_comments (
        id SERIAL PRIMARY KEY,
        module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_courses_created ON courses(created_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contacts_email_date ON contacts(email, created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_materials_module ON materials(module_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_materials_course ON materials(course_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);`);

    // Full-text search index on courses
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = 'idx_courses_search'
        ) THEN
          CREATE INDEX idx_courses_search ON courses USING GIN (to_tsvector('english', name || ' ' || description));
        END IF;
      END $$;
    `);

    await client.query('COMMIT');
    console.log('Database tables verified / created');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = migrate;
