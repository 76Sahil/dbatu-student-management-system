/**
 * ============================================================================
 * DBATU - Dr. Babasaheb Ambedkar Technological University
 * Student Information Management System (SIMS)
 * Enhanced Administrative Portal Controller
 * Vanilla JavaScript (ES6+)
 * ============================================================================
 */

// ============================================================================
// 1. API Configuration
// ============================================================================
/**
 * BACKEND API BASE URL CONFIGURATION
 * 
 * Local Development: Defaults to 'http://localhost:5000/api'
 * Production (Render): Uses actual deployed Render backend URL:
 * 'https://dbatu-student-management-system.onrender.com/api'
 */
const RENDER_API_URL = 'https://dbatu-student-management-system.onrender.com/api';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.API_BASE_URL) {
    return window.API_BASE_URL;
  }
  const isLocal = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' || 
                  window.location.protocol === 'file:';
  
  if (isLocal) {
    return 'http://localhost:5000/api';
  }
  return RENDER_API_URL;
};

const API_BASE = getApiBaseUrl();

// ============================================================================
// 2. DOM Elements Selection
// ============================================================================
const dom = {
  // Topbar & Navigation
  pageTitle: document.getElementById('page-title'),
  statusPill: document.getElementById('system-status-pill'),
  statusText: document.getElementById('status-text'),
  activeApiUrl: document.getElementById('active-api-url'),
  bannerContainer: document.getElementById('banner-container'),
  
  // Sidebar elements
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebar-overlay'),
  btnSidebarToggle: document.getElementById('btn-sidebar-toggle'),
  navOverview: document.getElementById('nav-overview'),
  navStudents: document.getElementById('nav-students'),
  navForm: document.getElementById('nav-form'),
  navStudentCount: document.getElementById('nav-student-count'),
  
  // Views
  viewOverview: document.getElementById('view-overview'),
  viewStudents: document.getElementById('view-students'),
  viewForm: document.getElementById('view-form'),

  // Quick Action buttons on Overview
  btnQuickAdd: document.getElementById('btn-quick-add'),
  btnQuickViewStudents: document.getElementById('btn-quick-view-students'),
  btnViewAllRecent: document.getElementById('btn-view-all-recent'),
  btnEmptyEnroll: document.getElementById('btn-empty-enroll'),

  // KPI Metrics
  kpiTotalStudents: document.getElementById('kpi-total-students'),
  kpiDepartmentsCount: document.getElementById('kpi-departments-count'),
  kpiSemestersCount: document.getElementById('kpi-semesters-count'),
  kpiRecentCount: document.getElementById('kpi-recent-count'),

  // Visualizations
  deptDistributionBars: document.getElementById('dept-distribution-bars'),
  deptDistributionBadge: document.getElementById('dept-distribution-badge'),
  deptEmptyState: document.getElementById('dept-empty-state'),
  semesterDistributionChips: document.getElementById('semester-distribution-chips'),
  semesterEmptyState: document.getElementById('semester-empty-state'),

  // Recent Students Table Preview
  recentStudentsTable: document.getElementById('recent-students-table'),
  recentStudentsTbody: document.getElementById('recent-students-tbody'),
  recentEmptyState: document.getElementById('recent-empty-state'),

  // Student Directory & Filters
  btnTableAddStudent: document.getElementById('btn-table-add-student'),
  searchInput: document.getElementById('search-input'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  filterDepartment: document.getElementById('filter-department'),
  filterSemester: document.getElementById('filter-semester'),
  btnResetFilters: document.getElementById('btn-reset-filters'),
  btnEmptyClearFilter: document.getElementById('btn-empty-clear-filter'),
  refreshBtn: document.getElementById('refresh-btn'),
  tableRecordSummary: document.getElementById('table-record-summary'),
  tableLoadingSpinner: document.getElementById('table-loading-spinner'),
  tableEmptyState: document.getElementById('table-empty-state'),
  studentsTable: document.getElementById('students-table'),
  studentsTableBody: document.getElementById('students-table-body'),

  // Add / Edit Student Form
  btnFormBackToDirectory: document.getElementById('btn-form-back-to-directory'),
  form: document.getElementById('student-form'),
  formHeading: document.getElementById('form-heading'),
  formSubheading: document.getElementById('form-subheading'),
  formModeBadge: document.getElementById('form-mode-badge'),
  editMongoId: document.getElementById('edit-mongo-id'),
  studentIdInput: document.getElementById('studentId'),
  nameInput: document.getElementById('name'),
  emailInput: document.getElementById('email'),
  departmentInput: document.getElementById('department'),
  semesterInput: document.getElementById('semester'),
  contactInput: document.getElementById('contact'),
  submitBtn: document.getElementById('submit-btn'),
  cancelEditBtn: document.getElementById('cancel-edit-btn'),
  resetFormBtn: document.getElementById('reset-form-btn'),

  // Delete Modal
  deleteModal: document.getElementById('delete-modal'),
  deleteStudentName: document.getElementById('delete-student-name'),
  deleteStudentId: document.getElementById('delete-student-id'),
  modalCancelBtn: document.getElementById('modal-cancel-btn'),
  modalConfirmDeleteBtn: document.getElementById('modal-confirm-delete-btn'),

  // Notifications
  toastContainer: document.getElementById('toast-container')
};

// Global App State
const state = {
  students: [],
  filteredStudents: [],
  activeView: 'view-overview',
  isEditing: false,
  editingId: null,
  pendingDeleteId: null,
  searchDebounceTimer: null,
  dbConnected: false
};

// ============================================================================
// 3. Helper Utilities & UI Notifications
// ============================================================================

/**
 * Escape HTML to prevent XSS
 */
const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Get initials for avatar (e.g. "Jane Doe" -> "JD")
 */
const getInitials = (name) => {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Display toast message
 */
const showToast = (message, type = 'info', duration = 4000) => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Close message">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  const removeToast = () => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  };

  closeBtn.addEventListener('click', removeToast);
  dom.toastContainer.appendChild(toast);

  if (duration > 0) {
    setTimeout(removeToast, duration);
  }
};

/**
 * Display alert banner in main container
 */
const setBanner = (htmlContent, type = 'warning') => {
  if (!htmlContent) {
    dom.bannerContainer.innerHTML = '';
    return;
  }
  const icons = {
    warning: '⚠️',
    danger: '🛑',
    info: '💡'
  };
  dom.bannerContainer.innerHTML = `
    <div class="alert-banner ${type}">
      <span class="alert-icon">${icons[type] || '⚠️'}</span>
      <div class="alert-content">${htmlContent}</div>
    </div>
  `;
};

// ============================================================================
// 4. View Switching & Navigation
// ============================================================================

const viewTitles = {
  'view-overview': 'Executive Overview & Analytics',
  'view-students': 'Student Directory',
  'view-form': 'Enroll New Student'
};

const switchView = (targetViewId) => {
  // Update view panels
  const views = [dom.viewOverview, dom.viewStudents, dom.viewForm];
  views.forEach((view) => {
    if (view) {
      if (view.id === targetViewId) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    }
  });

  // Update navigation item active state
  const navItems = [dom.navOverview, dom.navStudents, dom.navForm];
  navItems.forEach((btn) => {
    if (btn) {
      if (btn.dataset.view === targetViewId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });

  // Update topbar breadcrumbs and title
  if (targetViewId === 'view-form' && state.isEditing) {
    dom.pageTitle.textContent = 'Edit Student Details';
  } else {
    dom.pageTitle.textContent = viewTitles[targetViewId] || 'Executive Overview';
  }

  state.activeView = targetViewId;

  // Close mobile sidebar if open
  closeMobileSidebar();

  // Scroll to top of content
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const toggleMobileSidebar = () => {
  dom.sidebar.classList.toggle('open');
  dom.sidebarOverlay.classList.toggle('active');
};

const closeMobileSidebar = () => {
  dom.sidebar.classList.remove('open');
  dom.sidebarOverlay.classList.remove('active');
};

// ============================================================================
// 5. Dashboard Metrics & Visualizations (Computed from Live API Data)
// ============================================================================

const updateDashboardMetrics = () => {
  const students = state.students;
  const total = students.length;

  // 1. KPI Cards
  dom.kpiTotalStudents.textContent = total;
  dom.navStudentCount.textContent = total;

  // Unique departments
  const uniqueDepts = new Set(students.map(s => s.department).filter(Boolean));
  dom.kpiDepartmentsCount.textContent = uniqueDepts.size;

  // Unique active semesters (1 - 8)
  const uniqueSemesters = new Set(
    students
      .map(s => Number(s.semester))
      .filter(sem => !isNaN(sem) && Number.isInteger(sem) && sem >= 1 && sem <= 8)
  );
  dom.kpiSemestersCount.textContent = uniqueSemesters.size;

  // Recent enrollments (added within last 7 days)
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const recentStudentsCount = students.filter(s => {
    if (!s.createdAt) return false;
    const diff = now - new Date(s.createdAt).getTime();
    return diff <= sevenDaysMs && diff >= 0;
  }).length;

  // If newly created without timestamps or all created today, fallback to length or calculated count
  dom.kpiRecentCount.textContent = recentStudentsCount > 0 ? recentStudentsCount : (total > 0 ? total : 0);

  // 2. Department Distribution Visualization
  renderDepartmentDistribution(students);

  // 3. Semester Cohort Spread Visualization
  renderSemesterDistribution(students);

  // 4. Recently Enrolled Students Table Preview
  renderRecentStudentsTable(students);
};

/**
 * Render Department Distribution Bars
 */
const renderDepartmentDistribution = (students) => {
  if (!students || students.length === 0) {
    dom.deptDistributionBars.innerHTML = '';
    dom.deptEmptyState.style.display = 'block';
    dom.deptDistributionBadge.textContent = '0 Departments';
    return;
  }

  dom.deptEmptyState.style.display = 'none';

  // Group by department
  const deptCounts = {};
  students.forEach((s) => {
    const dept = s.department || 'Unassigned';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  const deptEntries = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);
  dom.deptDistributionBadge.textContent = `${deptEntries.length} Active Departments`;

  const total = students.length;
  dom.deptDistributionBars.innerHTML = '';

  deptEntries.forEach(([deptName, count]) => {
    const pct = Math.round((count / total) * 100);
    const item = document.createElement('div');
    item.className = 'dept-bar-item';
    item.innerHTML = `
      <div class="dept-bar-header">
        <span class="dept-name">${escapeHtml(deptName)}</span>
        <span class="dept-count-badge"><strong>${count}</strong> students (${pct}%)</span>
      </div>
      <div class="dept-bar-track">
        <div class="dept-bar-fill" style="width: ${pct}%;"></div>
      </div>
    `;
    dom.deptDistributionBars.appendChild(item);
  });
};

/**
 * Render Semester Cohort Spread
 */
const renderSemesterDistribution = (students) => {
  if (!students || students.length === 0) {
    dom.semesterDistributionChips.innerHTML = '';
    dom.semesterEmptyState.style.display = 'block';
    return;
  }

  dom.semesterEmptyState.style.display = 'none';

  // Count per semester (1 to 8)
  const semCounts = {};
  for (let i = 1; i <= 8; i++) {
    semCounts[i] = 0;
  }

  students.forEach((s) => {
    const sem = Number(s.semester);
    if (sem >= 1 && sem <= 8) {
      semCounts[sem] = (semCounts[sem] || 0) + 1;
    }
  });

  dom.semesterDistributionChips.innerHTML = '';
  for (let i = 1; i <= 8; i++) {
    const count = semCounts[i];
    const chip = document.createElement('div');
    chip.className = `semester-chip ${count > 0 ? 'has-students' : ''}`;
    chip.innerHTML = `
      <span class="semester-chip-title">Sem ${i}</span>
      <span class="semester-chip-count">${count}</span>
    `;
    dom.semesterDistributionChips.appendChild(chip);
  }
};

/**
 * Render Recently Enrolled Students Preview (Top 5)
 */
const renderRecentStudentsTable = (students) => {
  dom.recentStudentsTbody.innerHTML = '';

  if (!students || students.length === 0) {
    dom.recentStudentsTable.style.display = 'none';
    dom.recentEmptyState.style.display = 'flex';
    return;
  }

  dom.recentStudentsTable.style.display = 'table';
  dom.recentEmptyState.style.display = 'none';

  // Take the 5 most recent records
  const recentList = students.slice(0, 5);

  recentList.forEach((student) => {
    const tr = document.createElement('tr');
    tr.dataset.id = student._id;

    tr.innerHTML = `
      <td><span class="student-id-tag">${escapeHtml(student.studentId)}</span></td>
      <td><strong>${escapeHtml(student.name)}</strong></td>
      <td>${escapeHtml(student.email)}</td>
      <td><span class="dept-tag">${escapeHtml(student.department)}</span></td>
      <td><span class="sem-tag">Sem ${escapeHtml(student.semester)}</span></td>
      <td>${escapeHtml(student.contact)}</td>
      <td class="actions-header">
        <div class="row-actions">
          <button type="button" class="btn btn-secondary btn-sm action-edit-recent" title="Edit student">
            ✏️ Edit
          </button>
        </div>
      </td>
    `;

    // Bind edit
    tr.querySelector('.action-edit-recent').addEventListener('click', () => {
      populateFormForEdit(student);
      switchView('view-form');
    });

    dom.recentStudentsTbody.appendChild(tr);
  });
};

// ============================================================================
// 6. Form Validation & Management
// ============================================================================

const clearFieldErrors = () => {
  const fields = ['studentId', 'name', 'email', 'department', 'semester', 'contact'];
  fields.forEach(field => {
    const input = document.getElementById(field);
    const errorSpan = document.getElementById(`${field}-error`);
    if (input) input.classList.remove('has-error');
    if (errorSpan) errorSpan.textContent = '';
  });
};

const setFieldError = (fieldName, message) => {
  const input = document.getElementById(fieldName);
  const errorSpan = document.getElementById(`${fieldName}-error`);
  if (input) input.classList.add('has-error');
  if (errorSpan) errorSpan.textContent = message;
};

const validateFrontendForm = () => {
  clearFieldErrors();
  let isValid = true;

  const studentId = dom.studentIdInput.value.trim();
  const name = dom.nameInput.value.trim();
  const email = dom.emailInput.value.trim();
  const department = dom.departmentInput.value.trim();
  const semester = dom.semesterInput.value.trim();
  const contact = dom.contactInput.value.trim();

  // Validate studentId
  if (!studentId) {
    setFieldError('studentId', 'Student ID is required.');
    isValid = false;
  } else if (studentId.length < 2 || studentId.length > 30) {
    setFieldError('studentId', 'Student ID must be 2 - 30 characters.');
    isValid = false;
  }

  // Validate name
  if (!name) {
    setFieldError('name', 'Full legal name is required.');
    isValid = false;
  } else if (name.length < 2 || name.length > 100) {
    setFieldError('name', 'Name must be 2 - 100 characters.');
    isValid = false;
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    setFieldError('email', 'Institutional email is required.');
    isValid = false;
  } else if (!emailRegex.test(email)) {
    setFieldError('email', 'Please enter a valid email format.');
    isValid = false;
  }

  // Validate department
  if (!department) {
    setFieldError('department', 'Please select an academic department.');
    isValid = false;
  }

  // Validate semester (1 - 8)
  const semNum = Number(semester);
  if (!semester || isNaN(semNum) || !Number.isInteger(semNum) || semNum < 1 || semNum > 8) {
    setFieldError('semester', 'Semester must be an integer between 1 and 8.');
    isValid = false;
  }

  // Validate contact
  const cleanedContact = contact.replace(/[\s\-\(\)\+]/g, '');
  if (!contact) {
    setFieldError('contact', 'Contact phone number is required.');
    isValid = false;
  } else if (cleanedContact.length < 7 || cleanedContact.length > 15 || !/^\d+$/.test(cleanedContact)) {
    setFieldError('contact', 'Contact must contain between 7 and 15 digits.');
    isValid = false;
  }

  return isValid;
};

// Clear error on input event
['studentId', 'name', 'email', 'department', 'semester', 'contact'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', () => {
      el.classList.remove('has-error');
      const err = document.getElementById(`${id}-error`);
      if (err) err.textContent = '';
    });
  }
});

const resetFormToCreate = () => {
  dom.form.reset();
  clearFieldErrors();
  state.isEditing = false;
  state.editingId = null;
  dom.editMongoId.value = '';

  dom.formHeading.textContent = 'Enroll New Student';
  dom.formSubheading.textContent = 'Enter verified academic profile and contact details to register a new student.';
  dom.formModeBadge.textContent = 'Create Mode';
  dom.formModeBadge.className = 'badge badge-primary';
  dom.submitBtn.querySelector('.btn-text').textContent = 'Enroll Student Record';
  dom.cancelEditBtn.style.display = 'none';

  if (state.activeView === 'view-form') {
    dom.pageTitle.textContent = 'Enroll New Student';
  }
};

const populateFormForEdit = (student) => {
  clearFieldErrors();
  state.isEditing = true;
  state.editingId = student._id;
  dom.editMongoId.value = student._id;

  dom.studentIdInput.value = student.studentId || '';
  dom.nameInput.value = student.name || '';
  dom.emailInput.value = student.email || '';
  dom.departmentInput.value = student.department || '';
  dom.semesterInput.value = student.semester || '';
  dom.contactInput.value = student.contact || '';

  dom.formHeading.textContent = 'Edit Student Details';
  dom.formSubheading.textContent = `Updating registered record for ${student.name} (${student.studentId})`;
  dom.formModeBadge.textContent = 'Edit Mode';
  dom.formModeBadge.className = 'badge badge-edit';
  dom.submitBtn.querySelector('.btn-text').textContent = 'Update Student Record';
  dom.cancelEditBtn.style.display = 'inline-flex';

  dom.pageTitle.textContent = 'Edit Student Details';
};

// ============================================================================
// 7. API Operations & Data Fetching
// ============================================================================

/**
 * Check backend and MongoDB connection health
 */
const checkSystemHealth = async () => {
  dom.statusPill.className = 'status-pill status-checking';
  dom.statusText.textContent = 'Checking System...';

  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    if (!res.ok) throw new Error(`Health check returned status ${res.status}`);
    
    const data = await res.json();
    const dbStatus = data.database ? data.database.status : 'unknown';

    if (dbStatus === 'connected') {
      state.dbConnected = true;
      dom.statusPill.className = 'status-pill status-connected';
      dom.statusText.textContent = 'System Online (Atlas Connected)';
      setBanner(null);
    } else {
      state.dbConnected = false;
      dom.statusPill.className = 'status-pill status-checking';
      dom.statusText.textContent = 'Database Disconnected';
      setBanner(
        `<strong>Database not connected.</strong> The backend is online but MongoDB is disconnected. 
        Add your <code>MONGODB_URI</code> to <code>backend/.env</code> to perform student operations.`,
        'warning'
      );
    }
  } catch (err) {
    state.dbConnected = false;
    dom.statusPill.className = 'status-pill status-disconnected';
    dom.statusText.textContent = 'Backend Offline';
    setBanner(
      `<strong>Cannot reach backend API at <code>${API_BASE}</code>.</strong> 
      Make sure the Node.js server is started via <code>npm start</code> in <code>backend/</code>.`,
      'danger'
    );
  }
};

/**
 * Fetch students list from backend
 */
const fetchStudents = async () => {
  dom.tableLoadingSpinner.style.display = 'flex';
  dom.tableEmptyState.style.display = 'none';
  dom.studentsTable.style.display = 'none';

  try {
    const res = await fetch(`${API_BASE}/students`);
    const result = await res.json();

    dom.tableLoadingSpinner.style.display = 'none';

    if (!res.ok) {
      if (res.status === 503) {
        showToast(result.message || 'Database service unavailable.', 'warning');
      } else {
        showToast(result.message || 'Failed to fetch student records.', 'error');
      }
      renderEmptyState('Database Unavailable', result.message || 'Please connect MongoDB to view student records.');
      return;
    }

    state.students = result.data || [];
    applyClientFilters();
    updateDashboardMetrics();
  } catch (err) {
    dom.tableLoadingSpinner.style.display = 'none';
    renderEmptyState('Connection Error', 'Could not communicate with the backend API.');
    showToast('Failed to connect to backend API.', 'error');
  }
};

/**
 * Filter students list based on search, department, and semester
 */
const applyClientFilters = () => {
  const query = (dom.searchInput.value || '').trim().toLowerCase();
  const selectedDept = dom.filterDepartment.value;
  const selectedSem = dom.filterSemester.value;

  let filtered = [...state.students];

  // Search filter
  if (query) {
    filtered = filtered.filter(s => 
      (s.studentId && s.studentId.toLowerCase().includes(query)) ||
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.email && s.email.toLowerCase().includes(query)) ||
      (s.department && s.department.toLowerCase().includes(query))
    );
  }

  // Department filter
  if (selectedDept) {
    filtered = filtered.filter(s => s.department === selectedDept);
  }

  // Semester filter
  if (selectedSem) {
    filtered = filtered.filter(s => String(s.semester) === String(selectedSem));
  }

  state.filteredStudents = filtered;
  renderStudentTable(filtered);

  // Update record summary
  const total = state.students.length;
  const count = filtered.length;
  dom.tableRecordSummary.textContent = `Showing ${count} of ${total} students`;

  // Toggle clear search button
  dom.clearSearchBtn.style.display = query ? 'block' : 'none';

  // Toggle clear filter button in empty state
  const hasActiveFilters = Boolean(query || selectedDept || selectedSem);
  dom.btnEmptyClearFilter.style.display = hasActiveFilters ? 'inline-block' : 'none';
};

/**
 * Render Directory Table
 */
const renderStudentTable = (students) => {
  dom.studentsTableBody.innerHTML = '';

  if (!students || students.length === 0) {
    renderEmptyState(
      'No Students Match Filters', 
      'No student records matched your current query or department/semester filter.'
    );
    return;
  }

  dom.tableEmptyState.style.display = 'none';
  dom.studentsTable.style.display = 'table';

  students.forEach((student) => {
    const tr = document.createElement('tr');
    tr.dataset.id = student._id;

    const initials = getInitials(student.name);

    tr.innerHTML = `
      <td><span class="student-id-tag">${escapeHtml(student.studentId)}</span></td>
      <td>
        <div class="student-profile-cell">
          <div class="student-avatar">${escapeHtml(initials)}</div>
          <span class="student-name-bold">${escapeHtml(student.name)}</span>
        </div>
      </td>
      <td>${escapeHtml(student.email)}</td>
      <td><span class="dept-tag">${escapeHtml(student.department)}</span></td>
      <td><span class="sem-tag">Sem ${escapeHtml(student.semester)}</span></td>
      <td>${escapeHtml(student.contact)}</td>
      <td class="actions-header">
        <div class="row-actions">
          <button type="button" class="btn btn-secondary btn-sm action-edit" title="Edit student">
            ✏️ Edit
          </button>
          <button type="button" class="btn btn-danger btn-sm action-delete" title="Delete student">
            🗑️ Delete
          </button>
        </div>
      </td>
    `;

    // Bind edit action
    tr.querySelector('.action-edit').addEventListener('click', () => {
      populateFormForEdit(student);
      switchView('view-form');
    });

    // Bind delete action
    tr.querySelector('.action-delete').addEventListener('click', () => {
      promptDelete(student);
    });

    dom.studentsTableBody.appendChild(tr);
  });
};

const renderEmptyState = (title, desc) => {
  dom.studentsTable.style.display = 'none';
  dom.tableEmptyState.style.display = 'flex';
  document.getElementById('empty-title').textContent = title;
  document.getElementById('empty-desc').textContent = desc;
};

/**
 * Submit Form (Create or Update)
 */
const handleFormSubmit = async (e) => {
  e.preventDefault();

  if (!validateFrontendForm()) {
    showToast('Please correct validation errors before submitting.', 'warning');
    return;
  }

  const payload = {
    studentId: dom.studentIdInput.value.trim(),
    name: dom.nameInput.value.trim(),
    email: dom.emailInput.value.trim().toLowerCase(),
    department: dom.departmentInput.value.trim(),
    semester: parseInt(dom.semesterInput.value, 10),
    contact: dom.contactInput.value.trim()
  };

  dom.submitBtn.disabled = true;
  const isEditing = state.isEditing;
  const targetUrl = isEditing ? `${API_BASE}/students/${state.editingId}` : `${API_BASE}/students`;
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const res = await fetch(targetUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        setFieldError('studentId', result.message || 'Duplicate Student ID.');
        showToast(result.message, 'error');
      } else if (res.status === 400 && result.errors) {
        showToast(result.errors.join(' '), 'error');
      } else {
        showToast(result.message || 'Operation failed.', 'error');
      }
      return;
    }

    // Success
    showToast(result.message || (isEditing ? 'Student record updated successfully!' : 'Student enrolled successfully!'), 'success');
    resetFormToCreate();
    await fetchStudents();
    await checkSystemHealth();

    // Switch to Directory view to see updated student list
    switchView('view-students');
  } catch (err) {
    showToast('Network error while saving student record.', 'error');
  } finally {
    dom.submitBtn.disabled = false;
  }
};

/**
 * Delete Confirmation Workflow
 */
const promptDelete = (student) => {
  state.pendingDeleteId = student._id;
  dom.deleteStudentName.textContent = student.name;
  dom.deleteStudentId.textContent = student.studentId;
  dom.deleteModal.style.display = 'flex';
};

const closeDeleteModal = () => {
  dom.deleteModal.style.display = 'none';
  state.pendingDeleteId = null;
};

const handleConfirmDelete = async () => {
  if (!state.pendingDeleteId) return;

  dom.modalConfirmDeleteBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/students/${state.pendingDeleteId}`, {
      method: 'DELETE'
    });

    const result = await res.json();

    if (!res.ok) {
      showToast(result.message || 'Failed to delete student.', 'error');
      return;
    }

    showToast('Student record deleted successfully.', 'success');
    closeDeleteModal();

    // If currently editing the deleted student, reset form
    if (state.editingId === state.pendingDeleteId) {
      resetFormToCreate();
    }

    await fetchStudents();
  } catch (err) {
    showToast('Network error while deleting student.', 'error');
  } finally {
    dom.modalConfirmDeleteBtn.disabled = false;
  }
};

// ============================================================================
// 8. Event Listeners & Initialization
// ============================================================================

const initApp = () => {
  // Update footer info
  if (dom.activeApiUrl) {
    dom.activeApiUrl.textContent = API_BASE;
  }

  // Production check alert if using placeholder
  if (API_BASE.includes('REPLACE_WITH_YOUR_RENDER_BACKEND_URL')) {
    setBanner(
      `<strong>Deployment Notice:</strong> Frontend is configured with placeholder Render URL: 
      <code>${API_BASE}</code>. Update <code>RENDER_API_URL</code> in <code>frontend/script.js</code> with your actual Render service URL.`,
      'info'
    );
  }

  // Navigation Click Handlers
  dom.navOverview.addEventListener('click', () => switchView('view-overview'));
  dom.navStudents.addEventListener('click', () => switchView('view-students'));
  dom.navForm.addEventListener('click', () => {
    resetFormToCreate();
    switchView('view-form');
  });

  // Mobile Sidebar Toggle
  dom.btnSidebarToggle.addEventListener('click', toggleMobileSidebar);
  dom.sidebarOverlay.addEventListener('click', closeMobileSidebar);

  // Quick Action Buttons
  dom.btnQuickAdd.addEventListener('click', () => {
    resetFormToCreate();
    switchView('view-form');
  });
  dom.btnQuickViewStudents.addEventListener('click', () => switchView('view-students'));
  dom.btnViewAllRecent.addEventListener('click', () => switchView('view-students'));
  dom.btnEmptyEnroll.addEventListener('click', () => {
    resetFormToCreate();
    switchView('view-form');
  });
  dom.btnTableAddStudent.addEventListener('click', () => {
    resetFormToCreate();
    switchView('view-form');
  });
  dom.btnFormBackToDirectory.addEventListener('click', () => switchView('view-students'));

  // Form submit & cancel
  dom.form.addEventListener('submit', handleFormSubmit);
  dom.cancelEditBtn.addEventListener('click', () => {
    resetFormToCreate();
    switchView('view-students');
  });
  dom.resetFormBtn.addEventListener('click', resetFormToCreate);

  // Search & Filter Listeners
  dom.searchInput.addEventListener('input', () => {
    clearTimeout(state.searchDebounceTimer);
    state.searchDebounceTimer = setTimeout(() => {
      applyClientFilters();
    }, 300);
  });

  dom.clearSearchBtn.addEventListener('click', () => {
    dom.searchInput.value = '';
    applyClientFilters();
  });

  dom.filterDepartment.addEventListener('change', applyClientFilters);
  dom.filterSemester.addEventListener('change', applyClientFilters);

  const resetAllFilters = () => {
    dom.searchInput.value = '';
    dom.filterDepartment.value = '';
    dom.filterSemester.value = '';
    applyClientFilters();
  };

  dom.btnResetFilters.addEventListener('click', resetAllFilters);
  dom.btnEmptyClearFilter.addEventListener('click', resetAllFilters);

  // Refresh Button
  dom.refreshBtn.addEventListener('click', () => {
    checkSystemHealth();
    fetchStudents();
    showToast('Refreshed student directory and analytics.', 'info', 2000);
  });

  // Modal actions
  dom.modalCancelBtn.addEventListener('click', closeDeleteModal);
  dom.modalConfirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  dom.deleteModal.addEventListener('click', (e) => {
    if (e.target === dom.deleteModal) closeDeleteModal();
  });

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.deleteModal.style.display === 'flex') {
      closeDeleteModal();
    }
  });

  // Initial data loading & health check
  checkSystemHealth();
  fetchStudents();
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
