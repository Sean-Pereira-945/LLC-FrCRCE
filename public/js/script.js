document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page || '';
  const token = localStorage.getItem('token');
  const userType = localStorage.getItem('userType');

  initNavbar();
  initToastContainer();

  if (typeof AOS !== 'undefined') {
    AOS.init({
      once: true,
      offset: 50,
      duration: 800,
      easing: 'ease-out-cubic'
    });
  }

  if ((page === 'login' || page === 'register') && token && userType) {
    window.location.href = userType === 'teacher' ? '/teacher-dashboard' : '/student-dashboard';
    return;
  }

  if (page === 'home') {
    initHomePage();
  }

  if (page === 'login') {
    initLoginPage();
  }

  if (page === 'register') {
    initRegisterPage();
  }

  if (page === 'contact') {
    initContactPage();
  }

  if (page === 'search') {
    initSearchPage();
  }

  if (page === 'student-dashboard') {
    initStudentDashboard();
  }

  if (page === 'teacher-dashboard') {
    initTeacherDashboard();
  }
});

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const navLinksMobile = document.getElementById('navLinksMobile');

  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 4) {
        navbar.classList.add('navbar-scrolled');
      } else {
        navbar.classList.remove('navbar-scrolled');
      }
    });
  }

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      if (navLinksMobile) {
        navLinksMobile.classList.toggle('open');
      } else if (navLinks) {
        navLinks.classList.toggle('open');
      }
    });
  }

  // Active link highlighting
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === path || (path === '/' && href === '/home')) {
      link.classList.remove('text-secondary');
      link.classList.add('text-[#d07900]');
    } else {
      link.classList.remove('text-[#d07900]');
      link.classList.add('text-secondary');
    }
  });
}

function initToastContainer() {
  if (!document.querySelector('.toast-container')) {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
}

function showToast(message, type = 'info') {
  const container = document.querySelector('.toast-container');
  if (!container) {
    return;
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '!' : 'i';
  toast.innerHTML = `<span aria-hidden="true">${icon}</span><div>${message}</div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

function setButtonLoading(button, isLoading, loadingText = 'Please wait...') {
  if (!button) {
    return;
  }
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

async function apiRequest(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...(options.headers || {}) };

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    payload = {};
  }

  if (!response.ok) {
    const message = payload.message || payload.error || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

function getInitials(name) {
  if (!name) {
    return 'U';
  }
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePassword(value) {
  return value.length >= 8;
}

function markFieldState(input, message, valid) {
  const feedback = document.querySelector(`[data-feedback-for="${input.id}"]`);
  input.classList.remove('valid', 'invalid');

  if (valid) {
    input.classList.add('valid');
    if (feedback) {
      feedback.className = 'form-valid';
      feedback.textContent = message;
    }
  } else {
    input.classList.add('invalid');
    if (feedback) {
      feedback.className = 'form-error';
      feedback.textContent = message;
    }
  }
}

function initHomePage() {
  const links = document.querySelectorAll('.category-link');
  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const category = link.dataset.category;
      window.location.href = `/search?category=${encodeURIComponent(category)}`;
    });
  });

  const certifiedBadge = document.getElementById('certifiedBadge');
  const badgeTooltip = document.getElementById('badgeTooltip');
  if (certifiedBadge && badgeTooltip && typeof Popper !== 'undefined') {
    const popperInstance = Popper.createPopper(certifiedBadge, badgeTooltip, {
      placement: 'top',
      modifiers: [
        {
          name: 'offset',
          options: {
            offset: [0, 8],
          },
        },
      ],
    });

    const showEvents = ['mouseenter', 'focus'];
    const hideEvents = ['mouseleave', 'blur'];

    showEvents.forEach(event => {
      certifiedBadge.addEventListener(event, () => {
        badgeTooltip.classList.remove('opacity-0', 'pointer-events-none');
        badgeTooltip.classList.add('opacity-100');
        popperInstance.update();
      });
    });

    hideEvents.forEach(event => {
      certifiedBadge.addEventListener(event, () => {
        badgeTooltip.classList.remove('opacity-100');
        badgeTooltip.classList.add('opacity-0', 'pointer-events-none');
      });
    });
  }
}

function initLoginPage() {
  const form = document.getElementById('loginForm');
  const studentBtn = document.getElementById('loginRoleStudent');
  const teacherBtn = document.getElementById('loginRoleTeacher');
  const roleInput = document.getElementById('loginUserType');
  const formError = document.getElementById('loginFormError');
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');

  if (!form) {
    return;
  }

  const setRoleActive = (btn, isActive) => {
    if (isActive) {
      btn.classList.add('bg-primary-fixed', 'border-primary');
      btn.classList.remove('bg-white', 'border-outline-variant');
    } else {
      btn.classList.remove('bg-primary-fixed', 'border-primary');
      btn.classList.add('bg-white', 'border-outline-variant');
    }
  };

  const updateRole = (role) => {
    roleInput.value = role;
    setRoleActive(studentBtn, role === 'student');
    setRoleActive(teacherBtn, role === 'teacher');
  };

  studentBtn.addEventListener('click', () => updateRole('student'));
  teacherBtn.addEventListener('click', () => updateRole('teacher'));

  emailInput.addEventListener('input', () => {
    const valid = validateEmail(emailInput.value.trim());
    markFieldState(emailInput, valid ? 'Email looks good' : 'Enter a valid email address', valid);
  });

  passwordInput.addEventListener('input', () => {
    const valid = validatePassword(passwordInput.value);
    markFieldState(passwordInput, valid ? 'Strong enough' : 'Password must be at least 8 characters', valid);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.textContent = '';

    if (!validateEmail(emailInput.value.trim()) || !validatePassword(passwordInput.value)) {
      form.classList.add('form-shake');
      setTimeout(() => form.classList.remove('form-shake'), 300);
      formError.textContent = 'Please fix validation errors before continuing.';
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Signing in...');

    try {
      const payload = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: emailInput.value.trim(),
          password: passwordInput.value,
          userType: roleInput.value
        })
      });

      localStorage.setItem('token', payload.token);
      localStorage.setItem('userType', payload.userType);
      localStorage.setItem('userName', payload.name || 'User');
      localStorage.setItem('userId', payload.userId || '');

      showToast('Login successful. Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = payload.userType === 'teacher' ? '/teacher-dashboard' : '/student-dashboard';
      }, 1200);
    } catch (error) {
      form.classList.add('form-shake');
      setTimeout(() => form.classList.remove('form-shake'), 300);
      formError.textContent = error.message;
    } finally {
      setButtonLoading(submitButton, false);
    }
  });
}

function initRegisterPage() {
  const form = document.getElementById('registerForm');
  const studentBtn = document.getElementById('registerRoleStudent');
  const teacherBtn = document.getElementById('registerRoleTeacher');
  const roleInput = document.getElementById('registerUserType');
  const nameInput = document.getElementById('registerName');
  const emailInput = document.getElementById('registerEmail');
  const passwordInput = document.getElementById('registerPassword');
  const formError = document.getElementById('registerFormError');

  if (!form) {
    return;
  }

  const setRoleActive = (btn, isActive) => {
    if (isActive) {
      btn.classList.add('bg-primary-fixed', 'border-primary');
      btn.classList.remove('bg-white', 'border-outline-variant');
    } else {
      btn.classList.remove('bg-primary-fixed', 'border-primary');
      btn.classList.add('bg-white', 'border-outline-variant');
    }
  };

  const updateRole = (role) => {
    roleInput.value = role;
    setRoleActive(studentBtn, role === 'student');
    setRoleActive(teacherBtn, role === 'teacher');
  };

  studentBtn.addEventListener('click', () => updateRole('student'));
  teacherBtn.addEventListener('click', () => updateRole('teacher'));

  nameInput.addEventListener('input', () => {
    const valid = nameInput.value.trim().length >= 2;
    markFieldState(nameInput, valid ? 'Looks good' : 'Enter your full name', valid);
  });

  emailInput.addEventListener('input', () => {
    const valid = validateEmail(emailInput.value.trim());
    markFieldState(emailInput, valid ? 'Email looks good' : 'Enter a valid email address', valid);
  });

  passwordInput.addEventListener('input', () => {
    const valid = validatePassword(passwordInput.value);
    markFieldState(passwordInput, valid ? 'Strong enough' : 'Password must be at least 8 characters', valid);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.textContent = '';

    if (nameInput.value.trim().length < 2 || !validateEmail(emailInput.value.trim()) || !validatePassword(passwordInput.value)) {
      form.classList.add('form-shake');
      setTimeout(() => form.classList.remove('form-shake'), 300);
      formError.textContent = 'Please complete the form with valid details.';
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Creating account...');

    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          password: passwordInput.value,
          userType: roleInput.value
        })
      });

      showToast('Account created. Redirecting to login...', 'success');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (error) {
      form.classList.add('form-shake');
      setTimeout(() => form.classList.remove('form-shake'), 300);
      formError.textContent = error.message;
    } finally {
      setButtonLoading(submitButton, false);
    }
  });
}

function ensureSession(requiredRole) {
  const token = localStorage.getItem('token');
  const userType = localStorage.getItem('userType');
  if (!token || (requiredRole && userType !== requiredRole)) {
    window.location.href = '/login';
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userType');
  localStorage.removeItem('userName');
  localStorage.removeItem('userId');
  window.location.href = '/';
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) {
    return;
  }
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) {
    return;
  }
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

function badgeClass(category) {
  if (category === 'Technical') return 'badge-technical';
  if (category === 'Non-technical') return 'badge-non-technical';
  if (category === 'Self-Development') return 'badge-self-development';
  return 'badge-extra-curricular';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initStudentDashboard() {
  if (!ensureSession('student')) {
    return;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const userName = localStorage.getItem('userName') || 'Student';
  const userId = localStorage.getItem('userId');
  const nameNode = document.getElementById('studentName');
  const avatarNode = document.getElementById('studentAvatar');
  const enrolledCount = document.getElementById('enrolledCount');
  const upcomingCount = document.getElementById('upcomingCount');
  const openSlots = document.getElementById('openSlots');
  const myCoursesNode = document.getElementById('myCourses');
  const discoverNode = document.getElementById('discoverCourses');
  const syllabusImage = document.getElementById('syllabusImage');
  const syllabusTitle = document.getElementById('syllabusTitle');
  const syllabusStatus = document.getElementById('syllabusStatus');
  const syllabusZoomIn = document.getElementById('syllabusZoomIn');
  const syllabusZoomOut = document.getElementById('syllabusZoomOut');
  const syllabusReset = document.getElementById('syllabusReset');
  const syllabusDownload = document.getElementById('syllabusDownload');
  const enrollConfirmModal = document.getElementById('enrollConfirmModal');
  const enrollConfirmText = document.getElementById('enrollConfirmText');
  const enrollConfirmButton = document.getElementById('enrollConfirmButton');

  if (nameNode) nameNode.textContent = userName;
  if (avatarNode) avatarNode.textContent = getInitials(userName);

  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.dataset.closeModal));
  });

  let allCourses = [];
  let myEnrollments = [];
  let selectedCategory = 'all';
  let pendingEnrollId = '';
  let activeSyllabusUrl = '';
  let syllabusScale = 1;

  const resetSyllabusView = () => {
    syllabusScale = 1;
    if (syllabusImage) {
      syllabusImage.style.transform = 'scale(1)';
    }
  };

  const showSyllabusStatus = (message, isError = false) => {
    if (!syllabusStatus) {
      return;
    }
    syllabusStatus.textContent = message;
    syllabusStatus.className = isError ? 'form-error' : 'course-card-meta';
    syllabusStatus.style.display = message ? 'block' : 'none';
  };

  const render = () => {
    const enrolled = allCourses.filter((course) => (course.students || []).some((student) => String(student._id) === String(userId)));
    const discover = allCourses.filter((course) => !(course.students || []).some((student) => String(student._id) === String(userId)));
    const filteredDiscover = selectedCategory === 'all' ? discover : discover.filter((course) => course.category === selectedCategory);

    enrolledCount.textContent = String(enrolled.length);
    upcomingCount.textContent = String(enrolled.filter((course) => (course.students || []).length < course.capacity).length);
    openSlots.textContent = String(allCourses.reduce((total, course) => total + Math.max(course.capacity - (course.students || []).length, 0), 0));

    if (enrolled.length === 0) {
      myCoursesNode.innerHTML = '<p class="course-card-meta">You have not enrolled in any course yet.</p>';
    } else {
      myCoursesNode.innerHTML = enrolled.map((course) => {
        console.debug('Rendering Enrolled Course:', { id: course._id, name: course.name, logo: course.logo });
        const current = (course.students || []).length;
        const fill = Math.min(100, Math.round((current / course.capacity) * 100));
        return `
          <article class="card course-card card-hover">
            <div class="course-card-media">${course.logo ? `<img src="${course.logo}" alt="${course.name} logo" style="width:100%;height:100%;object-fit:cover;">` : '<span style="color:var(--text-secondary)">Course</span>'}</div>
            <div class="course-card-content">
              <span class="badge ${badgeClass(course.category)}">${course.category}</span>
              <h3 class="course-card-title">${course.name}</h3>
              <p class="course-card-meta">${course.teacher ? course.teacher.name : 'Unknown Instructor'} • ${course.schedule}</p>
              <div class="enrollment-bar"><div class="enrollment-bar-fill" style="width:${fill}%"></div></div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <a href="/course/${course._id}" class="btn btn-primary no-underline">Open Course</a>
                <button class="btn btn-secondary" data-view-syllabus="${course._id}" data-course-title="${escapeHtml(course.name)}">View Syllabus</button>
                <button class="btn btn-ghost" data-unenroll="${course._id}">Unenroll</button>
              </div>
            </div>
          </article>
        `;
      }).join('');
    }

    if (filteredDiscover.length === 0) {
      discoverNode.innerHTML = '<p class="course-card-meta">No courses found for this category.</p>';
    } else {
      discoverNode.innerHTML = filteredDiscover.map((course) => {
        console.debug('Rendering Discover Course:', { id: course._id, name: course.name, logo: course.logo });
        const current = (course.students || []).length;
        const full = current >= course.capacity;
        const myEnrollment = myEnrollments.find((e) => String(e.course_id) === String(course._id));
        const isPending = myEnrollment && myEnrollment.status === 'pending';
        return `
          <article class="card course-card card-hover">
            <div class="course-card-media">${course.logo ? `<img src="${course.logo}" alt="${course.name} logo" style="width:100%;height:100%;object-fit:cover;">` : '<span style="color:var(--text-secondary)">Course</span>'}</div>
            <div class="course-card-content">
              <span class="badge ${badgeClass(course.category)}">${course.category}</span>
              <h3 class="course-card-title">${course.name}</h3>
              <p class="course-card-meta">${course.teacher ? course.teacher.name : 'Unknown Instructor'} • ${course.schedule}</p>
              <p class="course-card-meta">Seats: ${current}/${course.capacity}</p>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-secondary" data-view-syllabus="${course._id}" data-course-title="${course.name}">View Syllabus</button>
                <button class="btn btn-primary" data-enroll="${course._id}" data-course-name="${escapeHtml(course.name)}" ${full || isPending ? 'disabled' : ''}>${isPending ? 'Pending Approval' : (full ? 'Course Full' : 'Enroll')}</button>
              </div>
            </div>
          </article>
        `;
      }).join('');
    }

    myCoursesNode.querySelectorAll('[data-unenroll]').forEach((button) => {
      button.addEventListener('click', async () => {
        const confirmed = window.confirm('Unenroll from this course?');
        if (!confirmed) {
          return;
        }
        setButtonLoading(button, true, 'Updating...');
        try {
          await apiRequest(`/api/courses/enroll/${button.dataset.unenroll}`, { method: 'DELETE' });
          showToast('Unenrolled successfully.', 'success');
          await loadCourses();
        } catch (error) {
          showToast(error.message, 'error');
        } finally {
          setButtonLoading(button, false);
        }
      });
    });

    discoverNode.querySelectorAll('[data-enroll]').forEach((button) => {
      button.addEventListener('click', () => {
        pendingEnrollId = button.dataset.enroll;
        if (enrollConfirmText) {
          enrollConfirmText.textContent = `You are about to enroll in ${button.dataset.courseName || 'this course'}. Continue?`;
        }
        openModal('enrollConfirmModal');
      });
    });

    document.querySelectorAll('[data-view-syllabus]').forEach((button) => {
      button.addEventListener('click', () => {
        const courseId = button.dataset.viewSyllabus;
        const course = allCourses.find((c) => String(c._id) === String(courseId));
        
        if (!course || !course.syllabusPath) {
          showToast('Syllabus not found for this course.', 'error');
          return;
        }

        activeSyllabusUrl = course.syllabusPath;
        resetSyllabusView();

        // Since it's a Cloudinary URL, we can safely assume it's an image or let the browser handle it.
        // We bypass the fetch entirely.
        syllabusImage.style.display = 'block';
        syllabusImage.src = activeSyllabusUrl;
        showSyllabusStatus('');

        if (syllabusDownload) {
          syllabusDownload.href = activeSyllabusUrl;
          syllabusDownload.download = `${course.name || 'course'}-syllabus`;
        }
        
        syllabusTitle.textContent = course.name || 'Course Syllabus';
        openModal('syllabusModal');
      });
    });

  };

  const loadCourses = async () => {
    try {
      const [coursesPayload, enrollmentsPayload] = await Promise.all([
        apiRequest('/api/courses/student'),
        apiRequest('/api/enrollments/my')
      ]);
      allCourses = coursesPayload.courses || [];
      myEnrollments = enrollmentsPayload.enrollments || [];
      render();
    } catch (error) {
      discoverNode.innerHTML = `<p class="form-error">${error.message}</p>`;
    }
  };

  document.querySelectorAll('.category-filter').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.category-filter').forEach((other) => other.classList.remove('active'));
      button.classList.add('active');
      selectedCategory = button.dataset.category;
      render();
    });
  });

  if (enrollConfirmModal && enrollConfirmButton) {
    enrollConfirmButton.addEventListener('click', async () => {
      if (!pendingEnrollId) {
        return;
      }
      setButtonLoading(enrollConfirmButton, true, 'Enrolling...');
      try {
        await apiRequest(`/api/courses/enroll/${pendingEnrollId}`, { method: 'POST' });
        showToast('Successfully enrolled in course.', 'success');
        closeModal('enrollConfirmModal');
        pendingEnrollId = '';
        await loadCourses();
      } catch (error) {
        showToast(error.message, 'error');
      } finally {
        setButtonLoading(enrollConfirmButton, false);
      }
    });
  }

  if (syllabusZoomIn) {
    syllabusZoomIn.addEventListener('click', () => {
      syllabusScale = Math.min(2, syllabusScale + 0.1);
      syllabusImage.style.transform = `scale(${syllabusScale.toFixed(2)})`;
    });
  }

  if (syllabusZoomOut) {
    syllabusZoomOut.addEventListener('click', () => {
      syllabusScale = Math.max(0.6, syllabusScale - 0.1);
      syllabusImage.style.transform = `scale(${syllabusScale.toFixed(2)})`;
    });
  }

  if (syllabusReset) {
    syllabusReset.addEventListener('click', resetSyllabusView);
  }

  loadCourses();
}

function initTeacherDashboard() {
  if (!ensureSession('teacher')) {
    return;
  }

  const logoutBtn = document.getElementById('logoutBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const nameNode = document.getElementById('teacherName');
  const avatarNode = document.getElementById('teacherAvatar');
  const userName = localStorage.getItem('userName') || 'Teacher';
  if (nameNode) nameNode.textContent = userName;
  if (avatarNode) avatarNode.textContent = getInitials(userName);

  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  const panel = document.getElementById('coursePanel');
  const panelTitle = document.getElementById('coursePanelTitle');
  const openPanelBtn = document.getElementById('openCreatePanel');
  const closePanelBtn = document.getElementById('closeCoursePanel');
  const courseForm = document.getElementById('courseForm');
  const tableBody = document.getElementById('teacherCoursesTable');
  const totalCourses = document.getElementById('totalCourses');
  const totalStudents = document.getElementById('totalStudents');
  const fullCourses = document.getElementById('fullCourses');
  const logoPreview = document.getElementById('logoPreview');

  let currentCourses = [];
  let pendingRequests = [];

  if (openPanelBtn) {
    openPanelBtn.addEventListener('click', () => {
      courseForm.reset();
      document.getElementById('courseId').value = '';
      panelTitle.textContent = 'Create New Course';
      logoPreview.innerHTML = '';
      panel.classList.add('open');
    });
  }

  if (closePanelBtn) {
    closePanelBtn.addEventListener('click', () => panel.classList.remove('open'));
  }

  document.getElementById('courseLogo').addEventListener('change', (event) => {
    const [file] = event.target.files;
    if (!file) {
      logoPreview.innerHTML = '';
      return;
    }
    const url = URL.createObjectURL(file);
    logoPreview.innerHTML = `<img src="${url}" alt="Logo preview" style="width:72px;height:72px;border-radius:12px;object-fit:cover;">`;
  });

  const render = () => {
    totalCourses.textContent = String(currentCourses.length);
    totalStudents.textContent = String(currentCourses.reduce((count, course) => count + (course.students ? course.students.length : 0), 0));
    fullCourses.textContent = String(currentCourses.filter((course) => (course.students || []).length >= course.capacity).length);

    if (currentCourses.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="course-card-meta">No courses created yet.</td></tr>';
      return;
    }

    tableBody.innerHTML = currentCourses.map((course) => {
      const enrolled = course.students ? course.students.length : 0;
      return `
        <tr class="border-b border-surface-variant last:border-0 hover:bg-surface-container-highest/20 transition-colors">
          <td class="py-4 px-4 text-sm font-medium text-on-surface">${course.name}</td>
          <td class="py-4 px-4">
            <span class="inline-block font-label text-[10px] uppercase tracking-widest px-2.5 py-1 bg-surface-container-high text-secondary rounded-full border border-outline-variant/30">
              ${course.category}
            </span>
          </td>
          <td class="py-4 px-4 text-sm text-secondary font-mono">${enrolled}/${course.capacity}</td>
          <td class="py-4 px-4 text-sm text-secondary truncate max-w-[200px]" title="${course.schedule}">${course.schedule}</td>
          <td class="py-4 px-4">
            <div class="flex items-center gap-2">
              <a href="/course/${course._id}" class="h-8 px-4 flex items-center justify-center rounded-full bg-[#04122e] text-white text-[11px] font-bold uppercase tracking-wider no-underline hover:opacity-90 transition-all active:scale-95 shadow-sm">Open</a>
              <button class="h-8 w-8 flex items-center justify-center rounded-lg border border-outline-variant bg-white text-secondary hover:text-primary hover:border-primary transition-all active:scale-95" data-edit-course="${course._id}" title="Edit Course">
                <span class="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button class="h-8 w-8 flex items-center justify-center rounded-lg border border-outline-variant bg-white text-secondary hover:text-primary hover:border-primary transition-all active:scale-95" data-view-course-syllabus="${course._id}" data-course-title="${course.name}" title="View Syllabus">
                <span class="material-symbols-outlined text-[18px]">description</span>
              </button>
              <button class="h-8 w-8 flex items-center justify-center rounded-lg border border-red-100 bg-white text-red-500 hover:bg-red-50 hover:border-red-500 transition-all active:scale-95" data-delete-course="${course._id}" title="Delete Course">
                <span class="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tableBody.querySelectorAll('[data-edit-course]').forEach((button) => {
      button.addEventListener('click', () => {
        const course = currentCourses.find((item) => String(item._id) === String(button.dataset.editCourse));
        if (!course) return;
        document.getElementById('courseId').value = course._id;
        document.getElementById('courseName').value = course.name;
        document.getElementById('courseDescription').value = course.description;
        document.getElementById('courseSchedule').value = course.schedule;
        document.getElementById('courseCapacity').value = course.capacity;
        document.getElementById('courseCategory').value = course.category;
        
        const logoUrlInput = document.getElementById('courseLogoUrl');
        if (logoUrlInput) {
          logoUrlInput.value = course.logo && !course.logo.startsWith('/uploads/') && !course.logo.includes('cloudinary') ? course.logo : '';
        }

        const syllabusUrlInput = document.getElementById('courseSyllabusUrl');
        if (syllabusUrlInput) {
          syllabusUrlInput.value = course.syllabusPath && !course.syllabusPath.startsWith('/uploads/') && !course.syllabusPath.includes('cloudinary') ? course.syllabusPath : '';
        }


        if (panelTitle) panelTitle.textContent = 'Edit Course';
        panel.classList.add('open');
      });
    });

    tableBody.querySelectorAll('[data-delete-course]').forEach((button) => {
      button.addEventListener('click', async () => {
        const courseId = button.dataset.deleteCourse;
        const confirmed = window.confirm('Delete this course permanently?');
        if (!confirmed) return;
        setButtonLoading(button, true, 'Deleting...');
        try {
          await apiRequest(`/api/courses/${courseId}`, { method: 'DELETE' });
          showToast('Course deleted successfully.', 'success');
          await loadCourses();
        } catch (error) {
          showToast(error.message, 'error');
        } finally {
          setButtonLoading(button, false);
        }
      });
    });

    tableBody.querySelectorAll('[data-view-course-syllabus]').forEach((button) => {
      button.addEventListener('click', () => {
        const courseId = button.dataset.viewCourseSyllabus;
        const course = currentCourses.find((c) => String(c._id) === String(courseId));
        
        if (!course || !course.syllabusPath) {
          showToast('Syllabus not found for this course.', 'error');
          return;
        }

        document.getElementById('syllabusImage').src = course.syllabusPath;
        document.getElementById('syllabusTitle').textContent = course.name || 'Course Syllabus';
        openModal('syllabusModal');
      });
    });

  };

  const loadRequests = async () => {
    try {
      const payload = await apiRequest('/api/enrollments/pending');
      pendingRequests = payload.requests || [];
      renderRequests();
    } catch (error) {
      console.error(error);
    }
  };

  const renderRequests = () => {
    const requestsSection = document.getElementById('requestsSection');
    const badge = document.getElementById('requestCountBadge');
    const tbody = document.getElementById('pendingRequestsTable');
    
    if (!requestsSection || !tbody) return;

    badge.textContent = pendingRequests.length;
    
    if (pendingRequests.length === 0) {
      requestsSection.style.display = 'none';
      return;
    }
    
    requestsSection.style.display = 'block';
    
    tbody.innerHTML = pendingRequests.map(req => `
      <tr class="border-b border-surface-variant last:border-0 hover:bg-surface-container-highest/20">
        <td class="py-3 px-4">
          <div class="font-medium text-sm text-on-surface">${escapeHtml(req.student_name)}</div>
          <div class="text-xs text-secondary">${escapeHtml(req.student_email)}</div>
        </td>
        <td class="py-3 px-4 text-sm font-medium text-primary">${escapeHtml(req.course_name)}</td>
        <td class="py-3 px-4 text-xs text-secondary">${new Date(req.enrolled_at).toLocaleDateString()}</td>
        <td class="py-3 px-4">
          <div class="flex gap-2">
            <button class="btn btn-primary btn-sm px-3 approve-btn" data-id="${req.id}">Approve</button>
            <button class="btn btn-secondary btn-sm px-3 reject-btn" data-id="${req.id}">Reject</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => updateStatus(btn.dataset.id, 'approved', btn));
    });
    tbody.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', async () => updateStatus(btn.dataset.id, 'rejected', btn));
    });
  };

  const updateStatus = async (id, status, btn) => {
    if (!confirm(`Are you sure you want to ${status.replace('ed', '')} this student?`)) return;
    setButtonLoading(btn, true, '...');
    try {
      await apiRequest(`/api/enrollments/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      showToast(`Enrollment ${status}`, 'success');
      loadRequests();
      loadCourses();
    } catch (error) {
      showToast(error.message, 'error');
      setButtonLoading(btn, false);
    }
  };

  const loadCourses = async () => {
    try {
      const payload = await apiRequest('/api/courses/teacher');
      currentCourses = payload.courses || [];
      render();
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="5" class="form-error">${error.message}</td></tr>`;
    }
  };

  loadRequests();

  courseForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = courseForm.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Saving...');

    const formData = new FormData(courseForm);
    const courseId = document.getElementById('courseId').value;
    const method = courseId ? 'PUT' : 'POST';
    const url = courseId ? `/api/courses/${courseId}` : '/api/courses';

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || payload.error || 'Request failed');
      }
      showToast(courseId ? 'Course updated successfully.' : 'Course created successfully.', 'success');
      panel.classList.remove('open');
      courseForm.reset();
      logoPreview.innerHTML = '';
      await loadCourses();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setButtonLoading(submitButton, false);
    }
  });

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.dataset.closeModal));
  });

  loadCourses();
}

function initContactPage() {
  const form = document.getElementById('contactForm');
  if (!form) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true, 'Sending...');

    try {
      await apiRequest('/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('contactName').value.trim(),
          email: document.getElementById('contactEmail').value.trim(),
          subject: document.getElementById('contactSubject').value.trim(),
          message: document.getElementById('contactMessage').value.trim(),
          website: document.getElementById('contactWebsite').value.trim()
        })
      });
      form.reset();
      showToast('Message sent successfully.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setButtonLoading(submitButton, false);
    }
  });
}

function initSearchPage() {
  const form = document.getElementById('searchForm');
  const queryInput = document.getElementById('searchQuery');
  const categorySelect = document.getElementById('searchCategory');
  const sortSelect = document.getElementById('searchSort');
  const capacityCheckbox = document.getElementById('searchHasCapacity');
  const resultNode = document.getElementById('searchResults');
  const emptyState = document.getElementById('searchEmpty');
  const activeChipsNode = document.getElementById('activeFilterChips');
  const clearFiltersButton = document.getElementById('clearFilters');

  if (!form) {
    return;
  }

  let searchTimer = null;

  const getFilters = () => ({
    q: queryInput.value.trim(),
    category: categorySelect.value,
    sort: sortSelect ? sortSelect.value : 'newest',
    hasCapacity: !!(capacityCheckbox && capacityCheckbox.checked)
  });

  const buildParams = (filters) => {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
    if (filters.hasCapacity) params.set('hasCapacity', 'true');
    return params;
  };

  const renderSkeletons = () => {
    resultNode.innerHTML = Array.from({ length: 3 }).map(() => `
      <article class="card course-card" style="margin-bottom:16px;">
        <div class="course-card-content">
          <div class="skeleton-line" style="width:30%;height:20px;"></div>
          <div class="skeleton-line" style="width:70%;height:28px;"></div>
          <div class="skeleton-line" style="width:50%;height:16px;"></div>
          <div class="skeleton-line" style="width:35%;height:16px;"></div>
          <div class="skeleton-actions">
            <div class="skeleton-line" style="width:110px;height:36px;"></div>
            <div class="skeleton-line" style="width:90px;height:36px;"></div>
          </div>
        </div>
      </article>
    `).join('');
  };

  const renderFilterChips = (filters) => {
    const chips = [];
    if (filters.q) chips.push({ key: 'q', label: `Keyword: ${filters.q}` });
    if (filters.category) chips.push({ key: 'category', label: filters.category });
    if (filters.hasCapacity) chips.push({ key: 'hasCapacity', label: 'Open seats only' });
    if (filters.sort && filters.sort !== 'newest') chips.push({ key: 'sort', label: `Sort: ${filters.sort}` });

    if (!activeChipsNode) {
      return;
    }

    if (!chips.length) {
      activeChipsNode.innerHTML = '';
      return;
    }

    activeChipsNode.innerHTML = chips.map((chip) => `
      <button class="filter-chip" type="button" data-chip-remove="${chip.key}">
        ${escapeHtml(chip.label)}
        <span aria-hidden="true">×</span>
      </button>
    `).join('');

    activeChipsNode.querySelectorAll('[data-chip-remove]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.chipRemove;
        if (target === 'q') queryInput.value = '';
        if (target === 'category') categorySelect.value = '';
        if (target === 'hasCapacity' && capacityCheckbox) capacityCheckbox.checked = false;
        if (target === 'sort' && sortSelect) sortSelect.value = 'newest';
        search();
      });
    });
  };

  const renderResults = (courses) => {
    if (!courses.length) {
      resultNode.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    resultNode.innerHTML = courses.map((course) => {
      const seats = course.enrolledCount || (course.students ? course.students.length : 0);
      const full = course.capacity ? seats >= course.capacity : false;
      return `
        <article class="card course-card card-hover" style="margin-bottom:16px;">
          <div class="course-card-media">${course.logo ? `<img src="${course.logo}" alt="${course.name} logo" style="width:100%;height:100%;object-fit:cover;">` : '<span style="color:var(--text-secondary)">Course</span>'}</div>
          <div class="course-card-content">
            <span class="badge ${badgeClass(course.category || 'Technical')}">${course.category || 'General'}</span>
            <h3 class="course-card-title">${course.name}</h3>
            <p class="course-card-meta">${course.teacher ? course.teacher.name : 'Unknown Instructor'} • ${course.schedule || 'Schedule TBA'}</p>
            <p class="course-card-meta">Seats ${seats}/${course.capacity || '-'}</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-secondary" data-search-syllabus="${course._id}">View Syllabus</button>
              <button class="btn btn-primary" data-search-enroll="${course._id}" ${full ? 'disabled' : ''}>${full ? 'Course Full' : 'Enroll'}</button>
            </div>
          </div>
        </article>
      `;

    }).join('');

    resultNode.querySelectorAll('[data-search-enroll]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (localStorage.getItem('userType') !== 'student') {
          showToast('Login as a student to enroll.', 'info');
          setTimeout(() => {
            window.location.href = '/login';
          }, 500);
          return;
        }
        setButtonLoading(button, true, 'Enrolling...');
        try {
          const confirmed = window.confirm('Confirm enrollment for this course?');
          if (!confirmed) {
            return;
          }
          await apiRequest(`/api/courses/enroll/${button.dataset.searchEnroll}`, { method: 'POST' });
          showToast('Enrollment successful.', 'success');
        } catch (error) {
          showToast(error.message, 'error');
        } finally {
          setButtonLoading(button, false);
        }
      });
    });

    resultNode.querySelectorAll('[data-search-syllabus]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!localStorage.getItem('token')) {
          showToast('Please login to view syllabus.', 'info');
          setTimeout(() => {
            window.location.href = '/login';
          }, 500);
          return;
        }
        try {
          const response = await fetch(`/api/courses/syllabus/${button.dataset.searchSyllabus}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          if (!response.ok) throw new Error('Unable to load syllabus');
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        } catch (error) {
          showToast(error.message, 'error');
        }
      });
    });
  };

  const search = async () => {
    const filters = getFilters();
    const params = buildParams(filters);

    if (!filters.q && !filters.category && !filters.hasCapacity && (!filters.sort || filters.sort === 'newest')) {
      resultNode.innerHTML = '';
      emptyState.style.display = 'block';
      renderFilterChips(filters);
      window.history.replaceState({}, '', '/search');
      return;
    }

    renderFilterChips(filters);
    renderSkeletons();
    emptyState.style.display = 'none';

    try {
      const payload = await apiRequest(`/api/courses/search?${params.toString()}`);
      const courses = payload.courses || [];
      renderResults(courses);
      const url = params.toString() ? `/search?${params.toString()}` : '/search';
      window.history.replaceState({}, '', url);
    } catch (error) {
      resultNode.innerHTML = `<p class="form-error">${error.message}</p>`;
    }
  };

  const debouncedSearch = () => {
    if (searchTimer) {
      clearTimeout(searchTimer);
    }
    searchTimer = setTimeout(() => {
      search();
    }, 300);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    search();
  });

  queryInput.addEventListener('input', debouncedSearch);
  categorySelect.addEventListener('change', search);
  if (sortSelect) {
    sortSelect.addEventListener('change', search);
  }
  if (capacityCheckbox) {
    capacityCheckbox.addEventListener('change', search);
  }

  if (clearFiltersButton) {
    clearFiltersButton.addEventListener('click', () => {
      queryInput.value = '';
      categorySelect.value = '';
      if (sortSelect) sortSelect.value = 'newest';
      if (capacityCheckbox) capacityCheckbox.checked = false;
      search();
    });
  }

  const urlParams = new URLSearchParams(window.location.search);
  const startQuery = urlParams.get('q') || '';
  const startCategory = urlParams.get('category') || '';
  const startSort = urlParams.get('sort') || 'newest';
  const startHasCapacity = urlParams.get('hasCapacity') === 'true';
  queryInput.value = startQuery;
  categorySelect.value = startCategory;
  if (sortSelect) {
    sortSelect.value = startSort;
  }
  if (capacityCheckbox) {
    capacityCheckbox.checked = startHasCapacity;
  }
  if (startQuery || startCategory || startHasCapacity || startSort !== 'newest') {
    search();
  }
}

