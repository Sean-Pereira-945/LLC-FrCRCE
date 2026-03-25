<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>LLCFRCRCE - Course Registration System</title>

  <!-- Font Awesome CDN for icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
    integrity="sha512-naukR7I+Nk6gp7tG+JcQP+jUfZY9HMTKm3y+JyaXu4gsftQvT/r2gicGwFV4LzFrULjX9wHlFaRJZXdTd8A=="
    crossorigin="anonymous" referrerpolicy="no-referrer" />

  <!-- Google Fonts: Inter (body) and Poppins (headings) -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600&display=swap" rel="stylesheet">

  <style>
    :root {
      --primary-color: #1e3a8a;
      --accent-color: #3b82f6;
      --bg-color: #f9fafb;
      --text-color: #111827;
      --code-bg: #1e293b;
      --code-color: #f8fafc;
      --section-bg: #ffffff;
      --border-radius: 12px;
      --font-heading: 'Poppins', sans-serif;
      --font-body: 'Inter', sans-serif;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-body);
      background-color: var(--bg-color);
      color: var(--text-color);
      line-height: 1.6;
      padding: 2rem;
    }

    h1, h2, h3 {
      font-family: var(--font-heading);
      margin-top: 2rem;
      margin-bottom: 1rem;
      color: var(--primary-color);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    h1 {
      font-size: 2.5rem;
    }

    p {
      margin-bottom: 1rem;
    }

    pre {
      background: var(--code-bg);
      color: var(--code-color);
      padding: 1rem;
      border-radius: var(--border-radius);
      overflow-x: auto;
      font-family: monospace;
    }

    code {
      font-family: monospace;
    }

    ul {
      list-style-type: none;
      padding-left: 1.5rem;
      margin-bottom: 1rem;
    }

    ul li::before {
      content: "✅";
      margin-right: 10px;
      color: var(--accent-color);
    }

    ol {
      margin-bottom: 1rem;
    }

    .section {
      max-width: 900px;
      margin: auto;
      background: var(--section-bg);
      padding: 2rem;
      border-radius: var(--border-radius);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
      margin-bottom: 2.5rem;
      transition: transform 0.3s ease;
    }

    .section:hover {
      transform: translateY(-5px);
    }

    .footer {
      text-align: center;
      font-size: 0.9rem;
      margin-top: 3rem;
      color: #6b7280;
    }

    a {
      color: var(--accent-color);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    .icon {
      font-size: 1.2rem;
      color: var(--accent-color);
    }

    @media (max-width: 600px) {
      body {
        padding: 1rem;
      }
      h1 {
        font-size: 2rem;
      }
      .section {
        padding: 1.5rem;
      }
    }
  </style>
</head>
<body>

  <!-- Project Title -->
  <div class="section">
    <h1><i class="fas fa-book-open icon"></i>LLCFRCRCE</h1>
    <p><em>A professional course registration and management platform designed to streamline student course preferences and reduce administrative workload.</em></p>
  </div>

  <!-- Project Overview -->
  <div class="section">
    <h2><i class="fas fa-info-circle icon"></i>Project Overview</h2>
    <p><strong>LLCFRCRCE</strong> is a mini-project developed to facilitate an efficient and user-friendly process for course enrollment. This system enables students to browse available courses, view detailed syllabi and schedules, and enroll in their preferred courses—all within an intuitive interface.</p>
    <p>Teachers are also provided with tools to manage and update course information, ensuring accuracy and ease of administration. The primary objective of this project is to <strong>digitize the course registration workflow</strong>, making it more transparent, manageable, and less error-prone than traditional manual or spreadsheet-based systems.</p>
  </div>

  <!-- Features -->
  <div class="section">
    <h2><i class="fas fa-list-check icon"></i>Key Features</h2>
    <ul>
      <li><strong>Student Interface:</strong> View comprehensive course listings, access syllabus, schedule, and instructor info, and enroll in preferred courses seamlessly.</li>
      <li><strong>Teacher Interface:</strong> Add, edit course details, and manage enrolled student lists.</li>
      <li><strong>Administrative Benefits:</strong> Automates preference collection, removes Excel dependency, and centralizes data for reporting and analysis.</li>
    </ul>
  </div>

  <!-- Installation -->
  <div class="section">
    <h2><i class="fas fa-download icon"></i>Installation Guide</h2>
    <ol>
      <li><strong>Clone the repository:</strong>
        <pre><code>git clone https://github.com/Sean-Pereira-945/LLC-FRCRCE.git</code></pre>
      </li>
      <li><strong>Navigate to the project directory:</strong>
        <pre><code>cd LLCFRCRCE</code></pre>
      </li>
      <li><strong>Install required dependencies:</strong>
        <pre><code>npm install</code></pre>
      </li>
    </ol>
  </div>

  <!-- Usage -->
  <div class="section">
    <h2><i class="fas fa-play icon"></i>Usage Instructions</h2>
    <p>Once installed, start the application using the following command:</p>
    <pre><code>npm start</code></pre>
    <p>The server will launch, allowing access to the web interface via your browser at the default port (usually <a href="http://localhost:3000">http://localhost:3000</a>).</p>
  </div>

  <!-- Contributing -->
  <div class="section">
    <h2><i class="fas fa-handshake icon"></i>Contributing</h2>
    <p>We welcome contributions from developers and educators alike. To contribute, please follow these guidelines:</p>
    <ol>
      <li>Fork the repository.</li>
      <li>Create a new feature branch:
        <pre><code>git checkout -b feature-name</code></pre>
      </li>
      <li>Commit your changes:
        <pre><code>git commit -m "Add feature-name"</code></pre>
      </li>
      <li>Push your branch to the remote repository:
        <pre><code>git push origin feature-name</code></pre>
      </li>
      <li>Open a Pull Request detailing the changes made.</li>
    </ol>
    <p>All submissions will be reviewed promptly.</p>
  </div>

  <!-- License -->
  <div class="section">
    <h2><i class="fas fa-copyright icon"></i>License</h2>
    <p>This project is licensed under the <strong>MIT License</strong> — feel free to use, modify, and distribute it under the terms of the license.</p>
  </div>

  <!-- Contact -->
  <div class="section">
    <h2><i class="fas fa-envelope icon"></i>Contact</h2>
    <p>For any inquiries, feedback, or suggestions, please reach out via email:</p>
    <p>📧 <a href="mailto:blazexander44@gmail.com">blazexander44@gmail.com</a></p>
  </div>

  <!-- Acknowledgments -->
  <div class="section">
    <h2><i class="fas fa-heart icon"></i>Acknowledgments</h2>
    <p>We would like to extend our sincere gratitude to:</p>
    <ul>
      <li><strong>Prof. Roshni</strong> – For providing the opportunity to work on this valuable project and guiding us throughout its development.</li>
    </ul>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>Thank you for taking the time to explore <strong>LLCFRCRCE</strong>. We hope it proves beneficial for both students and faculty alike!</p>
  </div>

</body>
</html>