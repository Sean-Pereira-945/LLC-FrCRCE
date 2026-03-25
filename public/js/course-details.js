document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const userType = localStorage.getItem('userType');
  const userName = localStorage.getItem('userName');

  if (!token) {
    window.location.href = '/login';
    return;
  }

  // Common UI Setup
  document.body.dataset.role = userType;
  if (userType === 'teacher') {
    document.getElementById('dashboardLink').href = '/teacher-dashboard';
    document.getElementById('mobileDashboardLink').href = '/teacher-dashboard';
  } else {
    document.getElementById('dashboardLink').href = '/student-dashboard';
    document.getElementById('mobileDashboardLink').href = '/student-dashboard';
  }

  document.getElementById('navUserName').textContent = userName;
  document.getElementById('navUserInitials').textContent = getInitials(userName);
  
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('mobileLogoutBtn').addEventListener('click', logout);
  
  document.getElementById('navToggle').addEventListener('click', () => {
    document.getElementById('navLinksMobile').classList.toggle('open');
  });

  // Modal logic
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.closeModal).classList.remove('open');
    });
  });

  // Extract Course ID from URL: /course/123
  const pathParts = window.location.pathname.split('/');
  const courseId = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
  if (!courseId || isNaN(courseId)) {
    alert('Invalid course ID');
    window.location.href = '/';
    return;
  }

  // State
  let courseData = null;

  // Tabs Logic
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active', 'border-[#04122e]', 'text-primary'));
      contents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active', 'border-[#04122e]', 'text-primary');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  // Initial Fetch
  loadCourseDetails();

  async function loadCourseDetails() {
    try {
      const response = await fetch(`/api/courses/${courseId}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load course details');
      }

      courseData = data;
      renderCourseHeader(data.course);
      renderStream(data.announcements);
      renderClasswork(data.modules, data.assignments);
      renderPeople(data.course);
    } catch (err) {
      console.error(err);
      document.getElementById('courseTitle').textContent = err.message || 'Error loading course';
      document.getElementById('courseTitle').classList.add('text-error', 'text-2xl');
      document.getElementById('courseTeacher').style.display = 'none';
    }
  }

  function renderCourseHeader(course) {
    document.getElementById('courseTitle').textContent = course.name;
    document.getElementById('courseTeacher').textContent = course.teacher ? course.teacher.name : 'Unknown Teacher';
  }

  // --- STREAM ---
  function renderStream(announcements) {
    const list = document.getElementById('announcementsList');
    if (announcements.length === 0) {
      list.innerHTML = `<div class="card p-8 text-center text-secondary border border-surface-variant bg-surface">No announcements yet.</div>`;
      return;
    }

    list.innerHTML = announcements.map(ann => `
      <div class="card p-6 border border-surface-variant">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-tertiary-fixed text-primary flex items-center justify-center font-bold">
            ${getInitials(courseData.course.teacher.name)}
          </div>
          <div>
            <h4 class="font-medium text-primary">${courseData.course.teacher.name}</h4>
            <span class="text-xs text-secondary">${new Date(ann.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <p class="text-on-surface whitespace-pre-wrap">${ann.content}</p>
      </div>
    `).join('');
  }

  const annForm = document.getElementById('announcementForm');
  if (annForm) {
    annForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = document.getElementById('announcementContent').value;
      const btn = document.getElementById('postAnnouncementBtn');
      btn.disabled = true;
      btn.textContent = 'Posting...';

      try {
        const res = await fetch(`/api/courses/${courseId}/announcements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ content })
        });
        if (!res.ok) throw new Error('Failed to post');
        document.getElementById('announcementContent').value = '';
        loadCourseDetails();
      } catch (err) {
        alert(err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Post';
      }
    });
  }

  // --- CLASSWORK (Modules & Materials) ---
  function renderClasswork(modules, assignments) {
    const container = document.getElementById('modulesContainer');
    if (modules.length === 0 && assignments.length === 0) {
      container.innerHTML = `<p class="text-secondary text-center py-8">No classwork has been added yet.</p>`;
      return;
    }

    container.innerHTML = modules.map(mod => `
      <div class="mb-10">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-primary pb-3 mb-4 gap-3">
          <h3 class="font-headline text-3xl italic text-primary">${mod.title}</h3>
          <div class="flex items-center gap-2">
            ${userType === 'teacher' ? `
              <button class="text-secondary hover:text-primary transition-colors flex items-center gap-1 text-sm font-medium open-edit-module-modal" data-module-id="${mod.id}" data-module-title="${encodeURIComponent(mod.title)}" data-module-desc="${encodeURIComponent(mod.description || '')}">
                <span class="material-symbols-outlined text-[18px]">edit</span> Edit
              </button>
              <button class="text-secondary hover:text-primary transition-colors flex items-center gap-1 text-sm font-medium open-material-modal" data-module="${mod.id}">
                <span class="material-symbols-outlined text-[18px]">upload_file</span> Material
              </button>
            ` : ''}
          </div>
        </div>
        ${mod.description ? `<p class="text-secondary mb-4">${mod.description}</p>` : ''}
        
        <div class="space-y-3">
          ${mod.materials.length === 0 ? `<p class="text-secondary text-sm italic py-2">No materials posted.</p>` : mod.materials.map(mat => `
            <a href="${mat.file_path}" target="_blank" class="flex items-center gap-4 p-4 rounded-xl border border-surface-variant hover:border-tertiary transition-colors group bg-white">
              <div class="w-10 h-10 rounded-full bg-secondary-container text-primary flex items-center justify-center">
                <span class="material-symbols-outlined text-[20px]">description</span>
              </div>
              <span class="font-medium text-primary group-hover:text-tertiary transition-colors">${mat.title}</span>
            </a>
          `).join('')}
        </div>

        <!-- Comments Section -->
        <div class="mt-6 pt-4 border-t border-surface-variant">
          <h4 class="font-medium text-sm text-secondary mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">forum</span> Class Comments</h4>
          <div class="space-y-3 mb-4 max-h-[200px] overflow-y-auto pr-2">
            ${(!mod.comments || mod.comments.length === 0) ? `<p class="text-secondary text-xs italic">No comments yet. Be the first to start the discussion!</p>` : mod.comments.map(c => `
              <div class="flex gap-3">
                <div class="w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center text-[10px] font-bold shrink-0">
                  ${getInitials(c.user?.name)}
                </div>
                <div class="bg-surface-container-low rounded-lg rounded-tl-none p-3 shadow-sm flex-1">
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-medium text-xs text-primary">${c.user?.name || 'User'}</span>
                    <span class="text-[10px] text-outline">${new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <p class="text-sm text-on-surface whitespace-pre-wrap">${c.content}</p>
                </div>
              </div>
            `).join('')}
          </div>
          <form class="comment-form flex gap-2" data-module-id="${mod.id}">
            <input type="text" class="form-input-themed flex-1 h-9 px-3 rounded-lg text-sm bg-surface-container-lowest border-outline-variant" placeholder="Add a class comment..." required>
            <button type="submit" class="btn btn-primary btn-sm px-3"><span class="material-symbols-outlined text-[16px]">send</span></button>
          </form>
        </div>
      </div>
    `).join('');

    // Render assignments below modules
    if (assignments && assignments.length > 0) {
      const assignmentsHtml = `
        <div class="mb-6">
          <div class="flex items-center gap-3 border-b-2 border-on-tertiary-container pb-3 mb-4">
            <span class="material-symbols-outlined text-on-tertiary-container">assignment</span>
            <h3 class="font-headline text-3xl italic text-on-tertiary-container">Assignments</h3>
          </div>
          <div class="space-y-4">
            ${assignments.map(asg => `
              <div class="card p-5 border border-surface-variant bg-surface-container-lowest rounded-xl flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="material-symbols-outlined text-on-tertiary-container text-[18px]">assignment_turned_in</span>
                    <h4 class="font-semibold text-on-surface">${asg.title}</h4>
                  </div>
                  <p class="text-secondary text-sm leading-relaxed whitespace-pre-wrap">${asg.description}</p>
                </div>
                ${asg.due_date ? `
                  <div class="shrink-0 flex items-center gap-1.5 bg-surface-container rounded-lg px-3 py-2">
                    <span class="material-symbols-outlined text-[16px] text-secondary">schedule</span>
                    <span class="text-xs font-label text-secondary whitespace-nowrap">Due ${new Date(asg.due_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', assignmentsHtml);
    }

    // Attach listeners to material buttons
    container.querySelectorAll('.open-material-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('matModuleId').value = btn.dataset.module;
        document.getElementById('materialModal').classList.add('open');
      });
    });

    // Attach listeners to edit module buttons
    container.querySelectorAll('.open-edit-module-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('editModuleId').value = btn.dataset.moduleId;
        document.getElementById('editModTitle').value = decodeURIComponent(btn.dataset.moduleTitle);
        document.getElementById('editModDescription').value = decodeURIComponent(btn.dataset.moduleDesc);
        document.getElementById('editModuleModal').classList.add('open');
      });
    });

    // Attach listeners to comment forms
    container.querySelectorAll('.comment-form').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = form.querySelector('input');
        const content = input.value.trim();
        const moduleId = form.dataset.moduleId;
        const btn = form.querySelector('button');
        
        if (!content) return;
        
        const token = localStorage.getItem('token');
        btn.disabled = true;
        try {
          const res = await fetch(`/api/modules/${moduleId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ content })
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.message || 'Failed to comment');
          loadCourseDetails();
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
        }
      });
    });
  }

  // Create Module
  document.getElementById('btnCreateModule')?.addEventListener('click', () => {
    document.getElementById('moduleModal').classList.add('open');
  });

  // Edit Module
  document.getElementById('editModuleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const moduleId = document.getElementById('editModuleId').value;
    const title = document.getElementById('editModTitle').value;
    const description = document.getElementById('editModDescription').value;
    const btn = document.getElementById('saveEditModuleBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    try {
      const res = await fetch(`/api/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update module');
      document.getElementById('editModuleModal').classList.remove('open');
      loadCourseDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });

  // Create Assignment
  document.getElementById('btnCreateAssignment')?.addEventListener('click', () => {
    document.getElementById('assignmentModal').classList.add('open');
  });

  document.getElementById('assignmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('asgTitle').value;
    const description = document.getElementById('asgDescription').value;
    const due_date = document.getElementById('asgDueDate').value;
    const btn = document.getElementById('saveAssignmentBtn');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    try {
      const res = await fetch(`/api/courses/${courseId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description, due_date: due_date || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create assignment');
      document.getElementById('assignmentForm').reset();
      document.getElementById('assignmentModal').classList.remove('open');
      loadCourseDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Assignment';
    }
  });


  document.getElementById('moduleForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('modTitle').value;
    const description = document.getElementById('modDescription').value;
    const btn = document.getElementById('saveModuleBtn');
    
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const res = await fetch(`/api/courses/${courseId}/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title, description })
      });
      if (!res.ok) throw new Error('Failed to create module');
      document.getElementById('moduleForm').reset();
      document.getElementById('moduleModal').classList.remove('open');
      loadCourseDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create';
    }
  });

  // Upload Material
  document.getElementById('materialForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const moduleId = document.getElementById('matModuleId').value;
    const title = document.getElementById('matTitle').value;
    const fileInput = document.getElementById('matFile');
    const btn = document.getElementById('saveMaterialBtn');

    if (!fileInput.files[0]) return alert('Please select a file');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('file', fileInput.files[0]);

    btn.disabled = true;
    btn.textContent = 'Uploading...';

    try {
      const res = await fetch(`/api/modules/${moduleId}/materials`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Upload failed');
      
      document.getElementById('materialForm').reset();
      document.getElementById('materialModal').classList.remove('open');
      loadCourseDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload';
    }
  });

  // --- PEOPLE ---
  function renderPeople(course) {
    if (course.teacher) {
      document.getElementById('teacherName').textContent = course.teacher.name;
      document.getElementById('teacherAvatar').textContent = getInitials(course.teacher.name);
    }

    document.getElementById('studentCount').textContent = `${course.students.length} student${course.students.length === 1 ? '' : 's'}`;
    const list = document.getElementById('studentsList');
    
    if (course.students.length === 0) {
      list.innerHTML = `<p class="text-secondary italic">No students enrolled yet.</p>`;
      return;
    }

    list.innerHTML = course.students.map(s => `
      <div class="flex items-center gap-4 py-3 border-b border-surface-variant last:border-0">
        <div class="w-8 h-8 rounded-full bg-surface-variant text-on-surface-variant flex items-center justify-center font-bold text-sm">
          ${getInitials(s.name)}
        </div>
        <span class="font-medium text-on-surface">${s.name}</span>
      </div>
    `).join('');
  }

  // Utils
  function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').slice(0, 2).map(n => n[0].toUpperCase()).join('');
  }

  function logout() {
    localStorage.clear();
    window.location.href = '/login';
  }
});
