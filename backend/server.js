const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// 1. CORS Configuration
// ==========================================
// Production Netlify frontend fallback URL
const DEFAULT_PRODUCTION_FRONTEND = 'https://melodious-mandazi-b2bc4f.netlify.app';

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  DEFAULT_PRODUCTION_FRONTEND
];

if (process.env.FRONTEND_URL) {
  // Support comma-separated URLs or single URL from FRONTEND_URL environment variable
  const envOrigins = process.env.FRONTEND_URL
    .split(',')
    .map(url => url.trim().replace(/\/$/, ''))
    .filter(Boolean);

  envOrigins.forEach(url => {
    if (!allowedOrigins.includes(url)) {
      allowedOrigins.push(url);
    }
  });
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. curl, postman, server-to-server)
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.trim().replace(/\/$/, '');

    // Check if origin matches allowed list
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    
    // In development mode, allow localhost with any port
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) {
      return callback(null, true);
    }
    
    // Disallow origin
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Mount CORS middleware and explicit OPTIONS preflight handler before routes
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Handle JSON body with payload limits
app.use(express.json({ limit: '1mb' }));

// Handle JSON parse errors gracefully
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request body.'
    });
  }
  next();
});

// ==========================================
// 2. Database Connection Handling
// ==========================================
const getDbStateString = () => {
  switch (mongoose.connection.readyState) {
    case 0: return 'disconnected';
    case 1: return 'connected';
    case 2: return 'connecting';
    case 3: return 'disconnecting';
    default: return 'unknown';
  }
};

const sanitizeMongoUri = (uri) => {
  if (!uri) return 'None';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:*****@');
};

const MONGODB_URI = process.env.MONGODB_URI;

let isConnecting = false;
let retryTimer = null;

const connectToDatabase = async () => {
  if (!MONGODB_URI) {
    console.warn('\n------------------------------------------------------------');
    console.warn('⚠️  [DATABASE WARNING] MONGODB_URI environment variable is missing.');
    console.warn('   Student data endpoints will return 503 until a database is connected.');
    console.warn('   To connect MongoDB Atlas, configure MONGODB_URI in environment.');
    console.warn('------------------------------------------------------------\n');
    return;
  }

  // Avoid overlapping connection attempts
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2 || isConnecting) {
    return;
  }

  isConnecting = true;
  console.log(`[Database] Attempting connection to: ${sanitizeMongoUri(MONGODB_URI)}`);

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    isConnecting = false;
    console.log('✅ [Database] MongoDB connected successfully.');
  } catch (err) {
    isConnecting = false;
    console.error('❌ [Database] MongoDB connection failed:', err.message);

    if (err.message && (err.message.includes('alert number 80') || err.message.includes('not whitelisted') || err.message.includes('Could not connect to any servers'))) {
      console.error('💡 [Diagnosis] Connection blocked by Atlas IP Access List. Ensure your client or Render outbound IP range is active in MongoDB Atlas Network Access.');
    }

    // Schedule retry if still disconnected
    if (mongoose.connection.readyState === 0) {
      if (retryTimer) clearTimeout(retryTimer);
      const retryDelay = 10000;
      console.log(`🔄 [Database] Will automatically retry connection in ${retryDelay / 1000}s...`);
      retryTimer = setTimeout(connectToDatabase, retryDelay);
    }
  }
};

// Initial connection attempt
connectToDatabase();

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  [Database] MongoDB disconnected.');
  if (mongoose.connection.readyState === 0) {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(connectToDatabase, 5000);
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ [Database] MongoDB reconnected.');
});

// Middleware to ensure DB is connected for student operations
const ensureDbConnected = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database service is currently unavailable. Please verify MONGODB_URI configuration in backend/.env.',
      dbStatus: getDbStateString()
    });
  }
  next();
};

// ==========================================
// 3. Mongoose Student Model & Schema
// ==========================================
const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, 'Student ID is required'],
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be at least 1'],
      max: [8, 'Semester must not exceed 8']
    },
    contact: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const Student = mongoose.model('Student', studentSchema);

// ==========================================
// 4. Input Validation Helpers
// ==========================================
const validateStudentInput = (data, isUpdate = false) => {
  const errors = [];
  const { studentId, name, email, department, semester, contact } = data;

  if (!isUpdate || studentId !== undefined) {
    if (!studentId || typeof studentId !== 'string' || !studentId.trim()) {
      errors.push('Student ID is required and must not be empty.');
    } else if (studentId.trim().length < 2 || studentId.trim().length > 30) {
      errors.push('Student ID must be between 2 and 30 characters.');
    }
  }

  if (!isUpdate || name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.push('Name is required and must not be empty.');
    } else if (name.trim().length < 2 || name.trim().length > 100) {
      errors.push('Name must be between 2 and 100 characters.');
    }
  }

  if (!isUpdate || email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !email.trim()) {
      errors.push('Email is required.');
    } else if (!emailRegex.test(email.trim())) {
      errors.push('Email address format is invalid.');
    }
  }

  if (!isUpdate || department !== undefined) {
    if (!department || typeof department !== 'string' || !department.trim()) {
      errors.push('Department is required.');
    }
  }

  if (!isUpdate || semester !== undefined) {
    const semNum = Number(semester);
    if (semester === undefined || semester === null || semester === '' || isNaN(semNum) || !Number.isInteger(semNum)) {
      errors.push('Semester must be an integer.');
    } else if (semNum < 1 || semNum > 8) {
      errors.push('Semester must be a valid semester number between 1 and 8.');
    }
  }

  if (!isUpdate || contact !== undefined) {
    if (!contact || typeof contact !== 'string' || !contact.trim()) {
      errors.push('Contact number is required.');
    } else {
      const cleaned = contact.trim().replace(/[\s\-\(\)\+]/g, '');
      if (cleaned.length < 7 || cleaned.length > 15 || !/^\d+$/.test(cleaned)) {
        errors.push('Contact number must contain between 7 and 15 digits.');
      }
    }
  }

  return errors;
};

// ==========================================
// 5. API Endpoints
// ==========================================

// GET /api/health
app.get('/api/health', (req, res) => {
  const dbStatus = getDbStateString();
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      configured: Boolean(process.env.MONGODB_URI)
    }
  });
});

// GET /api/students - List all or search students
app.get('/api/students', ensureDbConnected, async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { studentId: searchRegex },
          { name: searchRegex },
          { email: searchRegex },
          { department: searchRegex }
        ]
      };
    }

    const students = await Student.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/students/:id - Get student by MongoDB _id
app.get('/api/students/:id', ensureDbConnected, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student record ID format.'
      });
    }

    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/students - Create new student
app.post('/api/students', ensureDbConnected, async (req, res, next) => {
  try {
    const validationErrors = validateStudentInput(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: validationErrors
      });
    }

    const { studentId, name, email, department, semester, contact } = req.body;
    const cleanStudentId = studentId.trim();

    // Check duplicate studentId
    const existing = await Student.findOne({ studentId: cleanStudentId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A student with Student ID "${cleanStudentId}" already exists.`
      });
    }

    const newStudent = new Student({
      studentId: cleanStudentId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      department: department.trim(),
      semester: parseInt(semester, 10),
      contact: contact.trim()
    });

    const saved = await newStudent.save();

    res.status(201).json({
      success: true,
      message: 'Student added successfully.',
      data: saved
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A student with this Student ID already exists.'
      });
    }
    next(error);
  }
});

// PUT /api/students/:id - Update student details
app.put('/api/students/:id', ensureDbConnected, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student record ID format.'
      });
    }

    const validationErrors = validateStudentInput(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: validationErrors
      });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    const { studentId, name, email, department, semester, contact } = req.body;

    // Check duplicate studentId if changed
    if (studentId && studentId.trim() !== student.studentId) {
      const cleanStudentId = studentId.trim();
      const duplicate = await Student.findOne({
        studentId: cleanStudentId,
        _id: { $ne: id }
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `A student with Student ID "${cleanStudentId}" already exists.`
        });
      }
      student.studentId = cleanStudentId;
    }

    if (name !== undefined) student.name = name.trim();
    if (email !== undefined) student.email = email.trim().toLowerCase();
    if (department !== undefined) student.department = department.trim();
    if (semester !== undefined) student.semester = parseInt(semester, 10);
    if (contact !== undefined) student.contact = contact.trim();

    const updated = await student.save();

    res.status(200).json({
      success: true,
      message: 'Student details updated successfully.',
      data: updated
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A student with this Student ID already exists.'
      });
    }
    next(error);
  }
});

// DELETE /api/students/:id - Delete student
app.delete('/api/students/:id', ensureDbConnected, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student record ID format.'
      });
    }

    const deleted = await Student.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully.',
      data: { id: deleted._id }
    });
  } catch (error) {
    next(error);
  }
});

// 404 Route Handler for undefined endpoints
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found.`
  });
});

// Central Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: messages
    });
  }

  // Prevent leaking internal error details or database connection strings
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 [Server] Student Management API is running on http://localhost:${PORT}`);
  console.log(`🩺 [Server] Health check available at http://localhost:${PORT}/api/health`);
});
