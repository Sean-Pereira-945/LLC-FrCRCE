const fs = require('fs');
const path = require('path');

// 1. teacher-dashboard.html
let tdPath = path.join(__dirname, 'views', 'teacher-dashboard.html');
let tdHTML = fs.readFileSync(tdPath, 'utf8');

const requestsSection = `
      <!-- Enrollment Requests -->
      <section class="bg-surface-container-lowest rounded-2xl editorial-shadow p-6 mb-8" id="requestsSection" style="display: none;">
        <h2 class="font-headline text-2xl text-primary italic mb-6 flex items-center gap-2">
          Pending Enrollments <span class="bg-error text-on-error min-w-[24px] h-6 px-1.5 flex items-center justify-center rounded-full text-xs font-bold font-body not-italic" id="requestCountBadge">0</span>
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full" aria-label="Pending enrollments table">
            <thead>
              <tr class="border-b border-surface-variant">
                <th class="text-left py-3 px-4 font-label text-[11px] uppercase tracking-widest text-outline">Student</th>
                <th class="text-left py-3 px-4 font-label text-[11px] uppercase tracking-widest text-outline">Course</th>
                <th class="text-left py-3 px-4 font-label text-[11px] uppercase tracking-widest text-outline">Requested At</th>
                <th class="text-left py-3 px-4 font-label text-[11px] uppercase tracking-widest text-outline">Actions</th>
              </tr>
            </thead>
            <tbody id="pendingRequestsTable">
            </tbody>
          </table>
        </div>
      </section>
`;

if (!tdHTML.includes('id="requestsSection"')) {
  tdHTML = tdHTML.replace('<!-- Courses Table -->', requestsSection + '\n      <!-- Courses Table -->');
  fs.writeFileSync(tdPath, tdHTML);
}

// 2. script.js (Teacher dashboard logic & Student Pending states)
let scriptPath = path.join(__dirname, 'public', 'js', 'script.js');
let scriptJS = fs.readFileSync(scriptPath, 'utf8');

const loadReqsLogic = `
  const requestsSection = document.getElementById('requestsSection');
  const requestCountBadge = document.getElementById('requestCountBadge');
  const pendingRequestsTable = document.getElementById('pendingRequestsTable');

  const loadPendingRequests = async () => {
    if (!requestsSection) return;
    try {
      const res = await apiRequest('/api/enrollments/pending', { method: 'GET' });
      const reqs = res.requests || [];
      if (reqs.length > 0) {
        requestsSection.style.display = 'block';
        requestCountBadge.textContent = reqs.length;
        pendingRequestsTable.innerHTML = reqs.map(r => \`
          <tr class="border-b border-surface-variant last:border-0 hover:bg-surface-container/30 transition-colors">
            <td class="py-3 px-4">
              <div class="font-medium text-on-surface">\${r.student_name}</div>
              <div class="text-xs text-outline">\${r.student_email}</div>
            </td>
            <td class="py-3 px-4">
              <div class="inline-block px-2 py-1 bg-primary-container text-on-primary-container rounded text-xs font-medium">\${r.course_name}</div>
            </td>
            <td class="py-3 px-4 text-sm text-outline">\${new Date(r.enrolled_at).toLocaleDateString()}</td>
            <td class="py-3 px-4">
              <div class="flex gap-2">
                <button class="btn btn-sm btn-primary" data-req-action="approved" data-req-id="\${r.id}">Approve</button>
                <button class="btn btn-sm btn-danger px-4" data-req-action="rejected" data-req-id="\${r.id}">Reject</button>
              </div>
            </td>
          </tr>
        \`).join('');
        
        pendingRequestsTable.querySelectorAll('[data-req-action]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const action = btn.dataset.reqAction;
            const id = btn.dataset.reqId;
            setButtonLoading(btn, true, '...');
            try {
              await apiRequest(\`/api/enrollments/\${id}/status\`, {
                method: 'PUT',
                body: JSON.stringify({ status: action })
              });
              showToast(\`Enrollment \${action}\`, 'success');
              loadPendingRequests();
              loadCourses();
            } catch (err) {
              showToast(err.message, 'error');
              setButtonLoading(btn, false);
            }
          });
        });
      } else {
        requestsSection.style.display = 'none';
      }
    } catch (err) {
      console.error('Failed to load pending requests:', err);
    }
  };
`;

if (!scriptJS.includes('loadPendingRequests')) {
  scriptJS = scriptJS.replace("const logoPreview = document.getElementById('logoPreview');", "const logoPreview = document.getElementById('logoPreview');\n" + loadReqsLogic);
  scriptJS = scriptJS.replace(/loadCourses\(\);\n\}/, "loadCourses();\n  loadPendingRequests();\n}");
}

// 3. course-details.js 
let cdPath = path.join(__dirname, 'public', 'js', 'course-details.js');
let cdJS = fs.readFileSync(cdPath, 'utf8');

const commentsHtml = `
        <!-- Comments Section -->
        <div class="mt-6 pt-4 border-t border-surface-variant">
          <h4 class="font-medium text-sm text-secondary mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">forum</span> Class Comments</h4>
          <div class="space-y-3 mb-4 max-h-[200px] overflow-y-auto pr-2">
            \${(!mod.comments || mod.comments.length === 0) ? \`<p class="text-secondary text-xs italic">No comments yet. Be the first to start the discussion!</p>\` : mod.comments.map(c => \`
              <div class="flex gap-3">
                <div class="w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center text-[10px] font-bold shrink-0">
                  \${getInitials(c.user?.name)}
                </div>
                <div class="bg-surface-container-low rounded-lg rounded-tl-none p-3 shadow-sm flex-1">
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-medium text-xs text-primary">\${c.user?.name || 'User'}</span>
                    <span class="text-[10px] text-outline">\${new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <p class="text-sm text-on-surface whitespace-pre-wrap">\${c.content}</p>
                </div>
              </div>
            \`).join('')}
          </div>
          <form class="comment-form flex gap-2" data-module-id="\${mod.id}">
            <input type="text" class="form-input-themed flex-1 h-9 px-3 rounded-lg text-sm bg-surface-container-lowest border-outline-variant" placeholder="Add a class comment..." required>
            <button type="submit" class="btn btn-primary btn-sm px-3"><span class="material-symbols-outlined text-[16px]">send</span></button>
          </form>
        </div>
`;

if (!cdJS.includes('comment-form')) {
  cdJS = cdJS.replace(/        <\/div>\n      <\/div>\n    `\)\.join\(''\);/, `        </div>\n${commentsHtml}      </div>\n    \`).join('');`);
  
  const commentListener = `
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
          const res = await fetch(\`/api/modules/\${moduleId}/comments\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
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
`;
  cdJS = cdJS.replace(/container\.querySelectorAll\('\.open-material-modal'\)\.forEach\(btn => \{[\s\S]*?\}\);(?!.*comment\-form)/, `$&${commentListener}`);

  // Replace enrollment logic in course-details.js 
  const oldEnrollmentLogic = /const isEnrolled = course\.students && course\.students\.some\(\(s\) => s\._id === currentUserId\);\s*if \(userType === 'student'\) \{[\s\S]*?\}(?=\s*renderDetails\(\);)/;
  
  const newEnrollmentLogic = `
      const myEnrollmentsRes = await fetch('/api/enrollments/my', { headers: { Authorization: \`Bearer \${token}\` } });
      const myEnrollmentsData = await myEnrollmentsRes.json();
      const myStatus = myEnrollmentsData?.enrollments?.find(e => e.course_id == courseId)?.status;

      const isEnrolled = myStatus === 'approved';
      const isPending = myStatus === 'pending';

      if (userType === 'student') {
        if (isEnrolled) {
          enrollContainer.innerHTML = \`<button class="btn btn-secondary btn-sm px-4" id="unenrollButton" disabled>Enrolled (Joined \${new Date().toLocaleDateString()})</button>\`;
          document.getElementById('headerActions').innerHTML = '<button class="btn btn-secondary btn-sm" id="unenrollActionBtn">Leave Course</button>';
        } else if (isPending) {
          enrollContainer.innerHTML = \`<button class="btn btn-secondary btn-sm px-4 text-tertiary border-tertiary" disabled>Pending Approval</button>\`;
        } else {
          enrollContainer.innerHTML = \`<button class="btn btn-primary btn-sm px-6" id="enrollConfirmButton">Enroll Now</button>\`;
        }
      }`;

  cdJS = cdJS.replace(oldEnrollmentLogic, newEnrollmentLogic);
}
fs.writeFileSync(cdPath, cdJS);

let serverPath = path.join(__dirname, 'server.js');
let serverJS = fs.readFileSync(serverPath, 'utf8');
if (!serverJS.includes('/api/enrollments/my')) {
  const myEnrollments = `
app.get('/api/enrollments/my', protect, catchAsync(async (req, res) => {
  const result = await pool.query('SELECT course_id, status FROM enrollments WHERE student_id = $1', [req.user.id]);
  res.json({ success: true, enrollments: result.rows });
}));
`;
  serverJS = serverJS.replace('// ── Contact ──', myEnrollments + '\n// ── Contact ──');
  fs.writeFileSync(serverPath, serverJS);
}

// Adjust the successful enroll toast
if(scriptJS.includes("'Enrolled successfully'")) {
  scriptJS = scriptJS.replace("'Enrolled successfully'", "'Enrollment requested. Waiting for approval!'");
  fs.writeFileSync(scriptPath, scriptJS);
}

console.log('Frontend patched!');
