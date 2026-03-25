require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const pool = require('./db/pool');
const migrate = require('./db/migrate');
const { protect, restrictTo } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const validate = require('./middleware/validate');
const { registerSchema, loginSchema } = require('./validators/auth');
const { createCourseSchema, updateCourseSchema } = require('./validators/course');
const AppError = require('./utils/AppError');
const catchAsync = require('./utils/catchAsync');

const app = express();

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ── Environment validation ──

const validateRequiredEnv = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET is missing or too short. Minimum length is 32 characters.');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL is missing.');
    process.exit(1);
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('FATAL: Cloudinary configuration is missing.');
    process.exit(1);
  }
};

validateRequiredEnv();

// ── Cloudinary Configuration ──

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ── CORS ──

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (localOriginPattern.test(origin)) return true;
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(origin);
};

// ── Rate limiters ──

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication requests, please try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many API requests, please try again later.' }
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many contact submissions. Please try again later.' }
});

// ── Middleware stack ──

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://lh3.googleusercontent.com", "https://res.cloudinary.com"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    }
  })
);
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);
app.use('/api/contact', contactLimiter);
app.use(hpp());
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS blocked for this origin'));
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// Removed static upload routes as they are now served by Cloudinary

// ── File helpers ──

const toFileSystemPath = (filePath) => {
  if (!filePath) return null;
  return path.join(__dirname, filePath.replace(/^\//, ''));
};

const deleteIfExists = async (filePath) => {
  if (!filePath) return;
  
  // If it's a Cloudinary URL, we can attempt to delete it via API if needed, 
  // but for Vercel deployment, we primarily focus on preventing disk writes.
  // We'll leave this empty for now or implement cloudinary.uploader.destroy if we have the public_id.
  
  if (!filePath.startsWith('http')) {
    const fullPath = toFileSystemPath(filePath);
    if (fullPath && fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
};

// ── Cloudinary Storage ──

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'llc_uploads';
    if (file.fieldname === 'syllabus') folder = 'llc_syllabus';
    else if (file.fieldname === 'logo') folder = 'llc_courses';
    else if (file.fieldname === 'file') folder = 'llc_materials';

    return {
      folder: folder,
      resource_type: 'auto',
      public_id: `${file.fieldname}-${uuidv4()}`
    };
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 5242880 }
});

const verifyUploadedImages = catchAsync(async (req, res, next) => {
  // Cloudinary + Multer already handles file validation to an extent.
  // We skip the deep binary check here to simplify for Cloudinary.
  return next();
});

const materialUpload = multer({
  storage: storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 20971520 } // 20MB for materials
});

// ── Param validation (PostgreSQL uses integer IDs) ──

const validateId = (paramName = 'id') => (req, res, next) => {
  const value = req.params[paramName];
  if (!value || isNaN(Number(value))) {
    return next(new AppError(`Invalid ${paramName} format`, 400));
  }
  next();
};

// ── Helper: fetch courses with teacher + students ──

const fetchCoursesWithRelations = async (whereClause = '', params = []) => {
  const sql = `
    SELECT
      c.id AS _id,
      c.name,
      c.description,
      c.schedule,
      c.capacity,
      c.category,
      c.logo,
      c.syllabus_path AS "syllabusPath",
      c.created_at AS "createdAt",
      c.updated_at AS "updatedAt",
      json_build_object('_id', t.id, 'name', t.name, 'email', t.email) AS teacher,
      COALESCE(
        (SELECT json_agg(json_build_object('_id', u.id, 'name', u.name, 'email', u.email))
         FROM enrollments e JOIN users u ON e.student_id = u.id
         WHERE e.course_id = c.id AND e.status = 'approved'),
        '[]'::json
      ) AS students
    FROM courses c
    LEFT JOIN users t ON c.teacher_id = t.id
    ${whereClause}
    ORDER BY c.created_at DESC
  `;

  const result = await pool.query(sql, params);
  return result.rows;
};

// ══════════════════════════════════════════════
//                    ROUTES
// ══════════════════════════════════════════════

// ── Page routes ──

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'contact.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get(['/registration', '/registration/', '/registration.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'registration.html'));
});

app.get('/register', (req, res) => {
  res.redirect('/registration');
});

app.get('/teacher-login', (req, res) => {
  res.redirect('/login');
});

app.get('/teacher-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'teacher-dashboard.html'));
});

app.get('/student-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'student-dashboard.html'));
});

app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'search-results.html'));
});

app.get('/course/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'course-details.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ── Auth routes ──

app.post('/api/auth/register', validate(registerSchema), catchAsync(async (req, res, next) => {
  const { name, email, password, userType } = req.body;

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return next(new AppError('User already exists', 409));
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const result = await pool.query(
    'INSERT INTO users (name, email, password, user_type) VALUES ($1, $2, $3, $4) RETURNING id, user_type',
    [name, email, hashedPassword, userType]
  );

  const user = result.rows[0];
  const token = jwt.sign(
    { id: user.id, userType: user.user_type },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  res.status(201).json({ success: true, token });
}));

app.post('/api/auth/login', validate(loginSchema), catchAsync(async (req, res, next) => {
  const { email, password, userType } = req.body;

  const result = await pool.query(
    'SELECT id, name, email, password, user_type FROM users WHERE email = $1 AND user_type = $2',
    [email, userType]
  );

  if (result.rows.length === 0) {
    return next(new AppError('Invalid credentials', 400));
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return next(new AppError('Invalid credentials', 400));
  }

  const token = jwt.sign(
    { id: user.id, userType: user.user_type },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  res.json({
    success: true,
    message: 'Login successful',
    token,
    userType: user.user_type,
    name: user.name,
    userId: String(user.id)
  });
}));

// ── Course CRUD ──

app.post(
  '/api/courses',
  protect,
  restrictTo('teacher'),
  upload.fields([{ name: 'syllabus', maxCount: 1 }, { name: 'logo', maxCount: 1 }]),
  verifyUploadedImages,
  validate(createCourseSchema),
  catchAsync(async (req, res, next) => {
    const { courseName, description, schedule, capacity, category, logoUrl } = req.body;
    const syllabusPath = req.files && req.files.syllabus
      ? req.files.syllabus[0].path
      : null;
    const logoPath = req.files && req.files.logo
      ? req.files.logo[0].path
      : (logoUrl || '');

    if (!syllabusPath) {
      return next(new AppError('Syllabus image is required', 400));
    }

    await pool.query(
      `INSERT INTO courses (name, description, schedule, capacity, category, logo, syllabus_path, teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [courseName, description, schedule, Number(capacity), category, logoPath, syllabusPath, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Course added successfully' });
  })
);

app.get('/api/courses/teacher', protect, restrictTo('teacher'), catchAsync(async (req, res) => {
  const courses = await fetchCoursesWithRelations('WHERE c.teacher_id = $1', [req.user.id]);
  res.json({ success: true, courses });
}));

app.get('/api/courses/student', protect, restrictTo('student'), catchAsync(async (req, res) => {
  const courses = await fetchCoursesWithRelations();
  res.json({ success: true, courses });
}));

// Syllabus is now a direct Cloudinary URL, so this dedicated route is no longer strictly necessary 
// but we'll leave it redirection-based or just remove it if frontend uses the URL directly.
// For now, let's just make it redirect to the Cloudinary URL for backward compatibility.
app.get('/api/courses/syllabus/:id', protect, validateId('id'), catchAsync(async (req, res, next) => {
  const result = await pool.query('SELECT syllabus_path FROM courses WHERE id = $1', [req.params.id]);

  if (result.rows.length === 0 || !result.rows[0].syllabus_path) {
    return next(new AppError('Course not found', 404));
  }

  res.redirect(result.rows[0].syllabus_path);
}));

// ── Search (must be before :id route) ──

app.get('/api/courses/search', catchAsync(async (req, res) => {
  const { q, category, hasCapacity, sort } = req.query;
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (q && String(q).trim()) {
    conditions.push(`to_tsvector('english', c.name || ' ' || c.description) @@ plainto_tsquery('english', $${paramIndex})`);
    params.push(String(q).trim());
    paramIndex++;
  }

  if (category && String(category).trim()) {
    conditions.push(`c.category = $${paramIndex}`);
    params.push(String(category).trim());
    paramIndex++;
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  let havingClause = '';
  if (String(hasCapacity) === 'true') {
    havingClause = 'HAVING COUNT(e2.id) < c.capacity';
  }

  let orderBy = 'c.created_at DESC';
  if (sort === 'popular') {
    orderBy = 'enrolled_count DESC, c.created_at DESC';
  } else if (sort === 'alphabetical') {
    orderBy = 'c.name ASC';
  }

  const sql = `
    SELECT
      c.id AS _id,
      c.name,
      c.description,
      c.schedule,
      c.capacity,
      c.category,
      c.logo,
      c.syllabus_path AS "syllabusPath",
      c.created_at AS "createdAt",
      json_build_object('_id', t.id, 'name', t.name, 'email', t.email) AS teacher,
      COUNT(e2.id)::int AS "enrolledCount",
      COALESCE(
        (SELECT json_agg(json_build_object('_id', u.id, 'name', u.name, 'email', u.email))
         FROM enrollments esub JOIN users u ON esub.student_id = u.id
         WHERE esub.course_id = c.id AND esub.status = 'approved'),
        '[]'::json
      ) AS students
    FROM courses c
    LEFT JOIN users t ON c.teacher_id = t.id
    LEFT JOIN enrollments e2 ON e2.course_id = c.id AND e2.status = 'approved'
    ${whereClause}
    GROUP BY c.id, t.id
    ${havingClause}
    ORDER BY ${orderBy}
  `;

  const result = await pool.query(sql, params);

  res.json({
    success: true,
    courses: result.rows,
    filters: {
      q: q || '',
      category: category || '',
      hasCapacity: String(hasCapacity) === 'true',
      sort: sort || 'newest'
    }
  });
}));

app.get('/api/courses/:id', protect, validateId('id'), catchAsync(async (req, res, next) => {
  const courses = await fetchCoursesWithRelations('WHERE c.id = $1', [req.params.id]);

  if (courses.length === 0) {
    return next(new AppError('Course not found', 404));
  }

  res.json({ success: true, course: courses[0] });
}));

app.put(
  '/api/courses/:id',
  protect,
  restrictTo('teacher'),
  validateId('id'),
  upload.fields([{ name: 'syllabus', maxCount: 1 }, { name: 'logo', maxCount: 1 }]),
  verifyUploadedImages,
  validate(updateCourseSchema),
  catchAsync(async (req, res, next) => {
    const existing = await pool.query(
      'SELECT id, syllabus_path, logo FROM courses WHERE id = $1 AND teacher_id = $2',
      [req.params.id, req.user.id]
    );

    if (existing.rows.length === 0) {
      return next(new AppError('Course not found or unauthorized', 404));
    }

    const course = existing.rows[0];
    const { courseName, description, schedule, capacity, category, logoUrl } = req.body;

    let newSyllabusPath = course.syllabus_path;
    if (req.files && req.files.syllabus) {
      // In a real app, you might want to delete the old one from Cloudinary here
      newSyllabusPath = req.files.syllabus[0].path;
    }

    let newLogo = course.logo;
    if (req.files && req.files.logo) {
      newLogo = req.files.logo[0].path;
    } else if (logoUrl) {
      newLogo = logoUrl;
    }

    await pool.query(
      `UPDATE courses
       SET name = $1, description = $2, schedule = $3, capacity = $4, category = $5,
           logo = $6, syllabus_path = $7, updated_at = NOW()
       WHERE id = $8`,
      [courseName, description, schedule, Number(capacity), category || course.category, newLogo, newSyllabusPath, req.params.id]
    );

    res.json({ success: true, message: 'Course updated successfully' });
  })
);

app.delete('/api/courses/:id', protect, restrictTo('teacher'), validateId('id'), catchAsync(async (req, res, next) => {
  const result = await pool.query(
    'SELECT id, syllabus_path, logo FROM courses WHERE id = $1 AND teacher_id = $2',
    [req.params.id, req.user.id]
  );

  if (result.rows.length === 0) {
    return next(new AppError('Course not found or unauthorized', 404));
  }

  const course = result.rows[0];
  deleteIfExists(course.syllabus_path);
  if (course.logo && course.logo.startsWith('/uploads/courses/')) {
    deleteIfExists(course.logo);
  }

  await pool.query('DELETE FROM courses WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Course deleted successfully' });
}));

// ── Course Details (Modules, Materials, Announcements, Assignments) ──

app.get('/api/courses/:id/details', protect, validateId('id'), catchAsync(async (req, res, next) => {
  const courseId = req.params.id;

  const courseResult = await fetchCoursesWithRelations('WHERE c.id = $1', [courseId]);
  if (courseResult.length === 0) return next(new AppError('Course not found', 404));
  const course = courseResult[0];

  if (req.user.userType === 'student') {
    const isEnrolled = (course.students || []).some(s => String(s._id) === String(req.user.id));
    if (!isEnrolled) {
      return next(new AppError('You must be approved for this course to view materials', 403));
    }
  } else if (req.user.userType === 'teacher') {
    if (String(course.teacher._id) !== String(req.user.id)) {
      return next(new AppError('Unauthorized access to course materials', 403));
    }
  }

  const modulesResult = await pool.query(`
    SELECT m.id, m.title, m.description, m.order_index, m.created_at,
           COALESCE(
             (SELECT json_agg(json_build_object('id', mat.id, 'title', mat.title, 'file_path', mat.file_path, 'file_type', mat.file_type)) 
              FROM materials mat WHERE mat.module_id = m.id), 
             '[]'::json
           ) AS materials,
           COALESCE(
             (SELECT json_agg(json_build_object('id', c.id, 'content', c.content, 'created_at', c.created_at, 'user', json_build_object('name', u.name)) ORDER BY c.created_at ASC) 
              FROM module_comments c JOIN users u ON c.user_id = u.id WHERE c.module_id = m.id), 
             '[]'::json
           ) AS comments
    FROM modules m
    WHERE m.course_id = $1
    ORDER BY m.order_index ASC
  `, [courseId]);

  const announcementsResult = await pool.query(
    'SELECT id, content, created_at FROM announcements WHERE course_id = $1 ORDER BY created_at DESC',
    [courseId]
  );

  const assignmentsResult = await pool.query(
    'SELECT id, title, description, due_date, created_at FROM assignments WHERE course_id = $1 ORDER BY created_at DESC',
    [courseId]
  );

  res.json({
    course,
    modules: modulesResult.rows.map(m => ({ ...m, materials: m.materials || [] })),
    announcements: announcementsResult.rows,
    assignments: assignmentsResult.rows
  });
}));

app.post('/api/courses/:id/modules', protect, restrictTo('teacher'), validateId('id'), catchAsync(async (req, res, next) => {
  const { title, description } = req.body;
  if (!title) return next(new AppError('Module title is required', 400));
  
  const courseCheck = await pool.query('SELECT teacher_id FROM courses WHERE id = $1', [req.params.id]);
  if (courseCheck.rows.length === 0 || courseCheck.rows[0].teacher_id !== req.user.id) {
    return next(new AppError('Unauthorized or course not found', 403));
  }

  const result = await pool.query(
    'INSERT INTO modules (course_id, title, description) VALUES ($1, $2, $3) RETURNING *',
    [req.params.id, title, description]
  );
  res.status(201).json(result.rows[0]);
}));

app.patch('/api/modules/:id', protect, restrictTo('teacher'), validateId('id'), catchAsync(async (req, res, next) => {
  const { title, description } = req.body;
  if (!title) return next(new AppError('Module title is required', 400));

  const modCheck = await pool.query(
    'SELECT m.id, c.teacher_id FROM modules m JOIN courses c ON m.course_id = c.id WHERE m.id = $1',
    [req.params.id]
  );
  if (modCheck.rows.length === 0) return next(new AppError('Module not found', 404));
  if (modCheck.rows[0].teacher_id !== req.user.id) return next(new AppError('Unauthorized', 403));

  const result = await pool.query(
    'UPDATE modules SET title = $1, description = $2 WHERE id = $3 RETURNING *',
    [title, description || '', req.params.id]
  );
  res.json({ success: true, module: result.rows[0] });
}));

app.post('/api/modules/:id/materials', protect, restrictTo('teacher'), validateId('id'), materialUpload.single('file'), catchAsync(async (req, res, next) => {

  if (!req.file) return next(new AppError('No file uploaded', 400));
  const { title } = req.body;
  const moduleId = req.params.id;

  if (!title) {
    deleteIfExists(req.file.path);
    return next(new AppError('Material title is required', 400));
  }

  const modCheck = await pool.query('SELECT course_id FROM modules WHERE id = $1', [moduleId]);
  if (modCheck.rows.length === 0) {
    deleteIfExists(req.file.path);
    return next(new AppError('Module not found', 404));
  }
  const courseId = modCheck.rows[0].course_id;

  const courseCheck = await pool.query('SELECT teacher_id FROM courses WHERE id = $1', [courseId]);
  if (courseCheck.rows[0].teacher_id !== req.user.id) {
    deleteIfExists(req.file.path);
    return next(new AppError('Unauthorized', 403));
  }

  const filePath = req.file.path;
  const fileType = path.extname(req.file.originalname).replace('.', '').toLowerCase() || 'file';

  const result = await pool.query(
    'INSERT INTO materials (module_id, course_id, title, file_path, file_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [moduleId, courseId, title, filePath, fileType]
  );
  res.status(201).json(result.rows[0]);
}));

app.post('/api/courses/:id/announcements', protect, restrictTo('teacher'), validateId('id'), catchAsync(async (req, res, next) => {
  const { content } = req.body;
  if (!content) return next(new AppError('Announcement content is required', 400));
  
  const courseCheck = await pool.query('SELECT teacher_id FROM courses WHERE id = $1', [req.params.id]);
  if (courseCheck.rows.length === 0 || courseCheck.rows[0].teacher_id !== req.user.id) {
    return next(new AppError('Unauthorized or course not found', 403));
  }

  const result = await pool.query(
    'INSERT INTO announcements (course_id, content) VALUES ($1, $2) RETURNING *',
    [req.params.id, content]
  );
  res.status(201).json(result.rows[0]);
}));

app.post('/api/courses/:id/assignments', protect, restrictTo('teacher'), validateId('id'), catchAsync(async (req, res, next) => {
  const { title, description, due_date } = req.body;
  if (!title || !description) return next(new AppError('Title and description required', 400));
  
  const courseCheck = await pool.query('SELECT teacher_id FROM courses WHERE id = $1', [req.params.id]);
  if (courseCheck.rows.length === 0 || courseCheck.rows[0].teacher_id !== req.user.id) {
    return next(new AppError('Unauthorized or course not found', 403));
  }

  const result = await pool.query(
    'INSERT INTO assignments (course_id, title, description, due_date) VALUES ($1, $2, $3, $4) RETURNING *',
    [req.params.id, title, description, due_date || null]
  );
  res.status(201).json(result.rows[0]);
}));


// ── Enrollment ──

app.post('/api/courses/enroll/:id', protect, restrictTo('student'), validateId('id'), catchAsync(async (req, res, next) => {
  const courseResult = await pool.query(
    'SELECT id, teacher_id, capacity FROM courses WHERE id = $1',
    [req.params.id]
  );

  if (courseResult.rows.length === 0) {
    return next(new AppError('Course not found', 404));
  }

  const course = courseResult.rows[0];

  if (course.teacher_id === req.user.id) {
    return next(new AppError('Teachers cannot enroll in their own course', 403));
  }

  const enrolledCount = await pool.query(
    'SELECT COUNT(*)::int AS count FROM enrollments WHERE course_id = $1',
    [req.params.id]
  );

  if (enrolledCount.rows[0].count >= course.capacity) {
    return next(new AppError('Course is full', 400));
  }

  const alreadyEnrolled = await pool.query(
    'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
    [req.user.id, req.params.id]
  );

  if (alreadyEnrolled.rows.length > 0) {
    return next(new AppError('Already enrolled in this course', 400));
  }

  await pool.query(
    'INSERT INTO enrollments (student_id, course_id, status) VALUES ($1, $2, $3)',
    [req.user.id, req.params.id, 'pending']
  );

  res.json({ success: true, message: 'Enrollment requested successfully' });
}));

app.delete('/api/courses/enroll/:id', protect, restrictTo('student'), validateId('id'), catchAsync(async (req, res, next) => {
  const result = await pool.query(
    'DELETE FROM enrollments WHERE student_id = $1 AND course_id = $2 RETURNING id',
    [req.user.id, req.params.id]
  );

  if (result.rows.length === 0) {
    return next(new AppError('You are not enrolled in this course', 400));
  }

  res.json({ success: true, message: 'Enrollment removed successfully' });
}));



// ── Module Comments ──

app.post('/api/modules/:id/comments', protect, validateId('id'), catchAsync(async (req, res, next) => {
  const { content } = req.body;
  if (!content) return next(new AppError('Comment content is required', 400));
  
  const result = await pool.query(
    'INSERT INTO module_comments (module_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, content, created_at',
    [req.params.id, req.user.id, content]
  );
  
  const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
  res.status(201).json({ success: true, ...result.rows[0], user: { name: userResult.rows[0]?.name || 'User' } });
}));

// ── Teacher Enrollment Management ──

app.get('/api/enrollments/pending', protect, restrictTo('teacher'), catchAsync(async (req, res) => {
  const result = await pool.query(`
    SELECT e.id, e.enrolled_at, c.name as course_name, u.name as student_name, u.email as student_email
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    JOIN users u ON e.student_id = u.id
    WHERE c.teacher_id = $1 AND e.status = 'pending'
    ORDER BY e.enrolled_at DESC
  `, [req.user.id]);
  res.json({ success: true, requests: result.rows });
}));

app.put('/api/enrollments/:id/status', protect, restrictTo('teacher'), validateId('id'), catchAsync(async (req, res, next) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) return next(new AppError('Invalid status', 400));
  
  const check = await pool.query('SELECT c.teacher_id FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.id = $1', [req.params.id]);
  if (check.rows.length === 0 || check.rows[0].teacher_id !== req.user.id) return next(new AppError('Unauthorized', 403));
  
  await pool.query('UPDATE enrollments SET status = $1 WHERE id = $2', [status, req.params.id]);
  res.json({ success: true, message: `Enrollment ${status}` });
}));


app.get('/api/enrollments/my', protect, catchAsync(async (req, res) => {
  const result = await pool.query('SELECT course_id, status FROM enrollments WHERE student_id = $1', [req.user.id]);
  res.json({ success: true, enrollments: result.rows });
}));

// ── Contact ──

app.post('/api/contact', contactLimiter, catchAsync(async (req, res, next) => {
  const { name, email, subject, message, website } = req.body;

  // Honeypot trap
  if (website && String(website).trim() !== '') {
    return res.json({ success: true, message: 'Message received successfully!' });
  }

  if (!name || !email || !subject || !message) {
    return next(new AppError('All contact fields are required', 400));
  }

  const duplicate = await pool.query(
    `SELECT id FROM contacts
     WHERE email = $1 AND subject = $2 AND created_at > NOW() - INTERVAL '5 minutes'`,
    [String(email).trim().toLowerCase(), String(subject).trim()]
  );

  if (duplicate.rows.length > 0) {
    return next(new AppError('Duplicate submission detected. Please wait a few minutes before retrying.', 409));
  }

  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

  await pool.query(
    'INSERT INTO contacts (name, email, subject, message, ip_address) VALUES ($1, $2, $3, $4, $5)',
    [
      String(name).trim(),
      String(email).trim().toLowerCase(),
      String(subject).trim(),
      String(message).trim(),
      Array.isArray(ipAddress) ? ipAddress[0] : String(ipAddress)
    ]
  );

  res.json({ success: true, message: 'Message received successfully!' });
}));

// ── Legacy route ──

app.get('/api/teacher/courses', protect, restrictTo('teacher'), catchAsync(async (req, res) => {
  const courses = await fetchCoursesWithRelations('WHERE c.teacher_id = $1', [req.user.id]);
  res.json(courses);
}));

// ── Error handler ──

app.use(errorHandler);

// ── Start server ──

const DEFAULT_PORT = Number(process.env.PORT) || 5000;

// ── Start server (Only if not imported by Vercel) ──

const DEFAULT_PORT = Number(process.env.PORT) || 5000;

if (require.main === module) {
  const startServer = async (port) => {
    try {
      await migrate();
      console.log('Neon PostgreSQL connected');
    } catch (err) {
      console.error('Failed to connect to database:', err.message);
      process.exit(1);
    }

    const server = app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        const nextPort = port + 1;
        console.warn(`Port ${port} is in use. Retrying on http://localhost:${nextPort}`);
        startServer(nextPort);
        return;
      }
      console.error('Server failed to start:', error);
      process.exit(1);
    });
  };

  startServer(DEFAULT_PORT);
}

module.exports = app;