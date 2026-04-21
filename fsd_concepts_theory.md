# Full Stack Development (FSD) — Theory of Concepts Used in Core Konstruct

> **Project:** Core Konstruct — A role-based construction monitoring platform  
> **Stack:** HTML · CSS · JavaScript · Node.js · Express.js · MongoDB · Mongoose · JWT · bcrypt · Socket.IO · Multer

---

## Table of Contents

1. [Frontend Technologies](#1-frontend-technologies)
2. [Backend Technologies](#2-backend-technologies)
3. [Database (MongoDB & Mongoose)](#3-database-mongodb--mongoose)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Real-Time Communication (Socket.IO)](#5-real-time-communication-socketio)
6. [File Upload Handling (Multer)](#6-file-upload-handling-multer)
7. [Architectural Patterns & Concepts](#7-architectural-patterns--concepts)
8. [Environment & Configuration Management](#8-environment--configuration-management)
9. [CSS & UI Design Concepts](#9-css--ui-design-concepts)
10. [Security Concepts](#10-security-concepts)

---

## 1. Frontend Technologies

### 1.1 HTML5 (HyperText Markup Language)

**Definition:** HTML5 is the latest version of the standard markup language used to structure content on the web. It defines the **skeleton** of a web page using elements (tags) like headings, paragraphs, forms, images, tables, etc.

**Key Concepts Used in this Project:**
- **Semantic HTML:** Using meaningful tags like `<section>`, `<nav>`, `<footer>`, `<header>`, `<main>`, `<article>` instead of generic `<div>` for accessibility and SEO.
- **Forms & Inputs:** `<form>`, `<input>`, `<textarea>`, `<select>`, `<button>` — used for login, signup, contact forms, daily reports, attendance entry, etc.
- **Attributes:** `id`, `class`, `placeholder`, `required`, `type`, `aria-label`, `data-*` (custom data attributes).
- **Meta Tags:** `<meta charset>`, `<meta name="viewport">`, `<meta name="description">` for character encoding, responsiveness, and SEO.
- **External Resource Linking:** `<link>` for CSS files and fonts, `<script>` for JS files.
- **DOM (Document Object Model):** The tree-like representation of the HTML page that JavaScript can access and manipulate dynamically.

---

### 1.2 CSS3 (Cascading Style Sheets)

**Definition:** CSS3 is the styling language used to control the visual presentation and layout of HTML elements — colors, fonts, spacing, positioning, animations, and responsiveness.

**Key Concepts Used in this Project:**

- **CSS Variables (Custom Properties):** Defined as `--variable-name` in `:root`, allowing consistent theming (e.g., `--blue`, `--bg`, `--text-dark`, `--border`). Enables the **dark/light theme toggle** by changing `[data-theme="light"]` overrides.
  
- **Flexbox:** A one-dimensional layout model for arranging items in rows or columns. Used for navbars, cards, buttons, form layouts.
  ```css
  display: flex; align-items: center; justify-content: space-between;
  ```

- **CSS Grid:** A two-dimensional layout model for creating complex grid-based layouts. Used for features grid, blog grid, stats strip, footer grid, dashboard layouts.
  ```css
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;
  ```

- **Responsive Design (Media Queries):** `@media (max-width: 768px)` rules adapt the layout for different screen sizes (desktop → tablet → mobile).

- **Glassmorphism:** A modern UI trend using semi-transparent backgrounds with `backdrop-filter: blur()` to create a frosted-glass effect.
  ```css
  background: rgba(11, 17, 32, 0.7);
  backdrop-filter: blur(20px);
  ```

- **Transitions & Animations:**
  - `transition` for smooth hover effects (color, transform, opacity changes).
  - `@keyframes` for custom animations like `fadeUp`, `float` (decorative doodle animations).

- **Pseudo-elements:** `::before`, `::after` — used for decorative background overlays, gradients, and grid patterns.

- **Box Model:** Every element has `content → padding → border → margin`. Controlled via properties like `padding`, `margin`, `border`, `box-sizing: border-box`.

- **`clamp()` function:** Responsive font sizing — `font-size: clamp(2.2rem, 5vw, 3.6rem)` creates fluid typography that scales between min and max values.

---

### 1.3 JavaScript (ES6+)

**Definition:** JavaScript is the programming language of the web. It adds interactivity, dynamic content manipulation, and business logic to web pages. ES6+ refers to modern syntax features (arrow functions, `const/let`, template literals, `async/await`, destructuring, modules).

**Key Concepts Used in this Project:**

- **DOM Manipulation:** Selecting and modifying HTML elements:
  ```js
  document.getElementById('login-form');
  document.querySelectorAll('.role-tab');
  element.classList.add('active');
  element.textContent = 'Hello';
  element.innerHTML = '<i class="fa-solid fa-sun"></i>';
  ```

- **Event Handling:** Responding to user actions:
  ```js
  form.addEventListener('submit', (e) => { e.preventDefault(); ... });
  button.addEventListener('click', () => { ... });
  window.addEventListener('scroll', () => { ... });
  ```

- **`e.preventDefault()`:** Prevents the default browser action (e.g., stops form submission from reloading the page).

- **Fetch API (AJAX):** Making HTTP requests to the backend API without reloading the page:
  ```js
  const resp = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await resp.json();
  ```

- **Async/Await:** Modern syntax for handling asynchronous operations (API calls, database queries). Replaces `.then()` callback chains with synchronous-looking code.

- **Arrow Functions:** `(params) => { ... }` — concise function syntax introduced in ES6.

- **Destructuring:** Extracting values from objects/arrays:
  ```js
  const { name, email, password, role } = req.body;
  ```

- **Template Literals:** String interpolation using backticks:
  ```js
  `http://localhost:${PORT}`
  ```

- **Ternary Operator:** Short conditional expression:
  ```js
  theme === 'dark' ? 'light' : 'dark';
  ```

- **`localStorage` and `sessionStorage`:**
  - `localStorage` — persists data even after closing the browser (used for theme preference `ck_theme`).
  - `sessionStorage` — persists data only during the browser session (used for `ck_user`, `ck_token`).

- **JSON (JavaScript Object Notation):** Lightweight data interchange format. Used for API request/response bodies.
  ```js
  JSON.stringify(obj)  // Object → JSON string
  JSON.parse(str)      // JSON string → Object
  ```

- **Try-Catch (Error Handling):** Gracefully handles errors in async operations:
  ```js
  try { ... } catch (err) { console.error(err); }
  ```

- **IIFE (Immediately Invoked Function Expression):** `(function() { ... })()` — executes a function immediately after definition. Used for the auto-redirect check on the login page.

- **Higher-Order Array Methods:** `.forEach()`, `.map()`, `.filter()`, `.reduce()`, `.find()`, `.findIndex()`, `.every()` — used extensively for data processing.

---

## 2. Backend Technologies

### 2.1 Node.js

**Definition:** Node.js is a **JavaScript runtime environment** built on Chrome's V8 engine. It allows JavaScript to run **server-side** (outside the browser), enabling full-stack JavaScript development.

**Key Characteristics:**
- **Event-Driven Architecture:** Uses an event loop to handle asynchronous I/O operations without blocking the main thread.
- **Non-Blocking I/O:** Can handle thousands of concurrent connections efficiently because operations like file reads, database queries, and network requests don't block execution.
- **Single-Threaded:** Uses one main thread with the event loop, but delegates heavy I/O to background worker threads via libuv.
- **npm (Node Package Manager):** The world's largest package registry for installing third-party libraries (`express`, `mongoose`, `bcryptjs`, etc.).
- **`require()` — CommonJS Modules:** The module system used to import/export functionality:
  ```js
  const express = require('express');
  module.exports = mongoose.model('User', UserSchema);
  ```

---

### 2.2 Express.js

**Definition:** Express.js is a **minimal, fast, and unopinionated web application framework** for Node.js. It provides a robust set of features for building web applications and RESTful APIs.

**Key Concepts Used in this Project:**

- **App Instance:** `const app = express();` creates the application instance.

- **Routing:** Defines endpoints (URL + HTTP method) that handle client requests:
  ```js
  app.get('/api/projects', handler);      // Read
  app.post('/api/projects', handler);     // Create
  app.put('/api/projects/:id', handler);  // Update
  app.delete('/api/projects/:id', handler); // Delete
  ```

- **Route Parameters:** Dynamic URL segments — `req.params.id` extracts `:id` from `/api/projects/:id`.

- **Query Parameters:** URL query strings — `req.query.role` extracts `?role=admin` value.

- **Middleware:** Functions that execute during the request-response cycle. They have access to `req`, `res`, and `next()`:
  - **Built-in Middleware:**
    - `express.json()` — Parses incoming JSON request bodies.
    - `express.urlencoded()` — Parses URL-encoded form data.
    - `express.static()` — Serves static files (HTML, CSS, JS, images).
  - **Third-party Middleware:**
    - `cors()` — Enables Cross-Origin Resource Sharing.
    - `multer()` — Handles multipart/form-data (file uploads).
  - **Custom Middleware:**
    - `authMiddleware` — Verifies JWT token on protected routes.
    - File-blocking middleware using regex to prevent access to server files.

- **Request Object (`req`):** Contains information about the HTTP request — `req.body`, `req.params`, `req.query`, `req.headers`, `req.user` (custom).

- **Response Object (`res`):** Methods to send responses back to the client:
  - `res.json()` — Send JSON response.
  - `res.status(201).json()` — Set status code + JSON.
  - `res.sendFile()` — Send a file.
  - `res.end()` — End the response.

- **Error Handling:** `try-catch` blocks in each route with appropriate HTTP status codes (400, 401, 403, 404, 500).

- **Static File Serving:** `app.use(express.static(__dirname))` serves HTML/CSS/JS files directly.

- **SPA Catch-All:** `app.get('*', ...)` — A wildcard route that serves `index.html` for any unmatched route (Single Page Application fallback).

---

## 3. Database (MongoDB & Mongoose)

### 3.1 MongoDB

**Definition:** MongoDB is a **NoSQL (non-relational) document database**. Instead of tables and rows (like SQL databases), it stores data as **JSON-like documents** (BSON) in **collections**.

**Key Concepts:**
- **Document:** A single record stored as a JSON-like object (key-value pairs). Equivalent to a row in SQL.
- **Collection:** A group of related documents. Equivalent to a table in SQL.
- **Database:** Contains multiple collections.
- **BSON (Binary JSON):** MongoDB's internal binary format for storing documents, supporting more data types than JSON.
- **`_id`:** MongoDB automatically generates a unique ObjectId for every document.
- **MongoDB Atlas:** Cloud-hosted MongoDB service (used in this project — the connection string points to Atlas sharded cluster).
- **Replica Set:** A group of MongoDB servers that maintain the same data set for high availability (the connection string shows `replicaSet=atlas-qhgcat-shard-0`).

**Collections in this Project:**
| Collection | Purpose |
|---|---|
| `users` | Stores registered users (admin, supervisor, client) |
| `projects` | Active construction projects with stages, budget, progress |
| `attendances` | Daily worker attendance records |
| `materials` | Material inventory and usage logs |
| `measurements` | Site measurements (building, road, bridge, drainage) |
| `dailyreports` | Supervisor-submitted daily work reports with expenses |
| `sanctions` | Government approvals, NOCs, clearances |
| `completedprojects` | Archive of finished projects (portfolio) |
| `messages` | Contact form submissions from landing page |

---

### 3.2 Mongoose (ODM)

**Definition:** Mongoose is an **Object Data Modeling (ODM)** library for MongoDB and Node.js. It provides a schema-based solution to model application data, enforcing structure, validation, and default values.

**Key Concepts Used in this Project:**

- **Schema:** Defines the structure of documents in a collection — field names, types, required flags, defaults, enums:
  ```js
  const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    role: { type: String, enum: ['admin', 'supervisor', 'client'], required: true },
  }, { timestamps: true });
  ```

- **Model:** A compiled version of the Schema that provides an interface for CRUD operations:
  ```js
  const User = mongoose.model('User', UserSchema);
  ```

- **CRUD Operations:**
  - **Create:** `User.create({ name, email, password, role })`
  - **Read:** `Project.find()`, `Project.findById(id)`, `User.findOne({ email })`
  - **Update:** `Project.findByIdAndUpdate(id, data, { new: true, runValidators: true })`
  - **Delete:** `Material.findByIdAndDelete(id)`

- **Schema Options:**
  - `timestamps: true` — Automatically adds `createdAt` and `updatedAt` fields.
  - `trim: true` — Removes whitespace from both ends of a string.
  - `lowercase: true` — Converts email to lowercase before saving.
  - `unique: true` — Enforces uniqueness constraint (no two users with same email).
  - `enum: [...]` — Restricts values to a predefined set.
  - `default: value` — Sets a default value if none provided.

- **Embedded/Sub-documents (Nested Schema):** The `Project` model has an embedded `StageSchema` array:
  ```js
  const StageSchema = new mongoose.Schema({
    name: String, pct: Number, status: String
  }, { _id: false });
  // Used as: stages: [StageSchema]
  ```

- **Instance Methods:** Custom methods on document instances:
  ```js
  UserSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };
  ```

- **Pre-save Hooks (Middleware):** Functions that run before a document is saved:
  ```js
  UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, salt);
  });
  ```

- **Query Modifiers:**
  - `.sort({ createdAt: -1 })` — Sort by newest first.
  - `.limit(50)` — Limit results.
  - `.select('-password')` — Exclude password field from results.

- **Connection:** `mongoose.connect(process.env.MONGODB_URI)` establishes the database connection.

---

## 4. Authentication & Authorization

### 4.1 JWT (JSON Web Token)

**Definition:** JWT is an open standard (RFC 7519) for securely transmitting information between parties as a JSON object. It is **digitally signed** using a secret key, so the server can verify its authenticity.

**Structure:** A JWT has three parts separated by dots: `header.payload.signature`
- **Header:** Algorithm & token type (`{"alg": "HS256", "typ": "JWT"}`).
- **Payload:** Claims/data (user ID, email, role, expiry time).
- **Signature:** `HMAC-SHA256(header + payload, secret)` — ensures the token hasn't been tampered with.

**How it works in this project:**
1. User logs in with email/password → server validates credentials.
2. Server generates a JWT containing user info (`id`, `email`, `role`, `name`) with 24-hour expiry.
3. Token is sent to client and stored in `sessionStorage`.
4. For every subsequent API request, the client sends the token in the `Authorization: Bearer <token>` header.
5. The `authMiddleware` on the server verifies the token before processing the request.

**Key Functions:**
```js
// Sign (create) a token
jwt.sign({ id, email, role, name }, JWT_SECRET, { expiresIn: '24h' });

// Verify (validate) a token
jwt.verify(token, JWT_SECRET); // Returns decoded payload or throws error
```

**Why JWT?**
- **Stateless:** Server doesn't need to store session data — all info is in the token itself.
- **Scalable:** Works across multiple servers without shared session storage.
- **Secure:** Signed tokens can't be tampered with without the secret key.

---

### 4.2 bcrypt (Password Hashing)

**Definition:** bcrypt is a **password-hashing algorithm** designed to be slow and computationally expensive, making brute-force attacks impractical. The library used is `bcryptjs` (pure JavaScript implementation).

**Key Concepts:**
- **Hashing vs Encryption:** Hashing is **one-way** (you cannot reverse a hash to get the original password). Encryption is two-way (can be decrypted). Passwords should always be **hashed**, never encrypted.
- **Salt:** A random value added to the password before hashing to ensure that identical passwords produce different hashes. Prevents rainbow table attacks.
- **Salt Rounds (Cost Factor):** Determines how computationally intensive the hashing is. This project uses **10 rounds**.

**How it works:**
```js
// Hashing (during registration/save)
const salt = await bcrypt.genSalt(10);
this.password = await bcrypt.hash(this.password, salt);

// Comparing (during login)
const isMatch = await bcrypt.compare(candidatePassword, storedHash);
```

---

### 4.3 Role-Based Access Control (RBAC)

**Definition:** RBAC restricts system access based on the user's assigned **role**. Different roles see different dashboards and can perform different actions.

**Roles in this Project:**
| Role | Access Level | Dashboard |
|---|---|---|
| **Admin** (Contractor) | Full access — manages projects, views reports, finances, attendance, sanctions | `dashboard-admin.html` |
| **Supervisor** | Submit daily reports, mark attendance, upload photos, log measurements/materials | `dashboard-supervisor.html` |
| **Client** | View-only — see project progress, photos, updates | `dashboard-client.html` |

**Implementation:**
- **Client-side Auth Guard:** `authGuard('admin')` — checks `sessionStorage` for user role and redirects to login if unauthorized.
- **Server-side Authorization:** Checking `req.user.role` in routes:
  ```js
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  ```

---

## 5. Real-Time Communication (Socket.IO)

**Definition:** Socket.IO is a library that enables **real-time, bidirectional, event-based communication** between the browser (client) and the server using **WebSockets**.

**Key Concepts:**
- **WebSocket Protocol:** Unlike HTTP (request-response model), WebSockets maintain a **persistent connection** between client and server. Either side can send data at any time.
- **Event-Based:** Communication happens through named events:
  ```js
  // Server emits
  io.emit('data_updated', { time: Date.now() });
  
  // Client listens
  socket.on('data_updated', (data) => { refreshDashboard(); });
  ```
- **Broadcasting:** `io.emit()` sends to all connected clients simultaneously.

**Use in this Project:**
- When a supervisor submits a report, attendance, or material log, the server calls `broadcastUpdate()`.
- All connected admin/client dashboards instantly receive the update and can refresh their data — **no manual page reload needed**.

---

## 6. File Upload Handling (Multer)

**Definition:** Multer is a Node.js middleware for handling `multipart/form-data`, which is the encoding type used for **file uploads** in HTML forms.

**Key Concepts Used:**

- **Disk Storage:** Files are saved to the server's filesystem (`/uploads/` directory) with unique filenames (timestamp + random number):
  ```js
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1E6);
      cb(null, unique + path.extname(file.originalname));
    }
  });
  ```

- **File Filter:** Restricts uploads to only allowed image types (`jpeg`, `jpg`, `png`, `webp`, `gif`). Validates both the file extension and the MIME type.

- **Size Limit:** `limits: { fileSize: 10 * 1024 * 1024 }` — maximum 10 MB per file.

- **Multiple Files:** `upload.array('photos', 10)` — accepts up to 10 files in a single upload under the field name `photos`.

---

## 7. Architectural Patterns & Concepts

### 7.1 Client-Server Architecture

**Definition:** The application follows a **client-server model** where:
- **Client (Browser):** Renders HTML/CSS, executes JavaScript, makes API requests.
- **Server (Node.js/Express):** Processes requests, executes business logic, communicates with the database, sends responses.

The client and server communicate over **HTTP/HTTPS** using JSON as the data format.

---

### 7.2 RESTful API Design

**Definition:** REST (Representational State Transfer) is an architectural style for designing networked applications. RESTful APIs use **HTTP methods** to perform CRUD operations on **resources** identified by URLs.

**REST Principles Applied:**
| HTTP Method | URL Pattern | Action | Example |
|---|---|---|---|
| `GET` | `/api/projects` | Read all projects | Fetch project list |
| `GET` | `/api/projects/:id` | Read one project | Fetch specific project details |
| `POST` | `/api/projects` | Create new | Add a new project |
| `PUT` | `/api/projects/:id` | Update | Edit project details |
| `DELETE` | `/api/projects/:id` | Delete | Remove a project |

**Key REST Characteristics:**
- **Stateless:** Each request contains all the information needed (JWT token, body data). The server doesn't remember previous requests.
- **Resource-Based:** URLs represent resources (`/api/projects`, `/api/attendance`, `/api/materials`).
- **Standard HTTP Status Codes:**
  - `200` — OK (success)
  - `201` — Created (resource successfully created)
  - `400` — Bad Request (validation error)
  - `401` — Unauthorized (missing/invalid token)
  - `403` — Forbidden (role not allowed)
  - `404` — Not Found
  - `500` — Internal Server Error

---

### 7.3 MVC Pattern (Model-View-Controller)

**Definition:** MVC is a software design pattern that separates an application into three interconnected components:

| Component | Responsibility | In This Project |
|---|---|---|
| **Model** | Data structure + business logic + database interaction | `models/User.js`, `models/Project.js`, etc. (Mongoose schemas) |
| **View** | User interface / presentation | `index.html`, `login.html`, `dashboard-admin.html`, CSS files |
| **Controller** | Handles user requests, processes input, returns response | Route handlers in `server.js` (the `async (req, res) => {}` functions) |

---

### 7.4 SPA Fallback (Single Page Application Concept)

The catch-all route `app.get('*', ...)` serves `index.html` for any unmatched URL. This pattern is used in SPAs where client-side JavaScript handles routing instead of the server. While this project uses **multi-page architecture** (separate HTML files), the catch-all ensures graceful fallback.

---

### 7.5 Middleware Chain Pattern

Express processes requests through a **pipeline of middleware functions**. Each middleware can:
1. Execute code
2. Modify `req` and `res` objects
3. End the request-response cycle
4. Call `next()` to pass control to the next middleware

**Order in this project:**
```
Request → CORS → JSON Parser → URL-Encoded Parser → File Blocker → Static Files → Auth Middleware → Route Handler → Response
```

---

## 8. Environment & Configuration Management

### 8.1 dotenv

**Definition:** The `dotenv` library loads environment variables from a `.env` file into `process.env`. This keeps sensitive configuration (database credentials, API keys, secrets) **outside the codebase**.

**Variables Used:**
| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `PORT` | Server port number (default: 3000) |

**Why use environment variables?**
- **Security:** Sensitive data (passwords, secrets) is not committed to version control.
- **Portability:** Different environments (dev, staging, production) can use different values without code changes.
- **`.gitignore`:** The `.env` file is excluded from Git to prevent credential leaks.

---

### 8.2 package.json & npm

**Definition:** `package.json` is the manifest file for a Node.js project. It lists:
- **Metadata:** name, version, description, author, license.
- **Dependencies:** Third-party packages the project needs.
- **Scripts:** Custom commands (`npm start`, `npm run dev`, `npm run seed`).

**Dependency Management:**
- `npm install` reads `package.json` and downloads all dependencies into `node_modules/`.
- `package-lock.json` locks exact dependency versions for reproducible builds.

---

## 9. CSS & UI Design Concepts

### 9.1 Theming (Dark/Light Mode)

The project implements a **dual-theme system** using CSS custom properties and the `data-theme` HTML attribute:
- Default theme is stored in `localStorage` for persistence.
- `[data-theme="light"]` CSS selectors override dark-mode variables.
- `toggleTheme()` JavaScript function switches between themes dynamically.

---

### 9.2 Responsive Web Design (RWD)

**Definition:** Designing web pages to render correctly across all screen sizes and devices.

**Techniques Used:**
- **Media Queries:** `@media (max-width: 768px) { ... }` applies styles only below certain breakpoints.
- **Fluid Grid:** `grid-template-columns: repeat(4, 1fr)` → `1fr 1fr` → `1fr` as viewport shrinks.
- **Viewport Meta Tag:** `<meta name="viewport" content="width=device-width, initial-scale=1.0">` ensures proper scaling on mobile.
- **Relative Units:** `rem`, `em`, `%`, `vw`, `vh` instead of fixed `px` values.
- **`clamp()` for fluid typography.**

---

### 9.3 Glassmorphism

A modern design trend featuring:
- Semi-transparent backgrounds (`rgba()` with alpha < 1).
- Background blur (`backdrop-filter: blur()`).
- Subtle borders and light shadows.
- Creates a "frosted glass" effect over underlying content.

---

### 9.4 CSS Animations

- **`@keyframes`:** Defines animation sequences (`fadeUp`, `float`).
- **`transition`:** Smooth property changes on user interaction (hover, focus).
- **`animation` shorthand:** Applies keyframe animations to elements with duration, timing function, iteration count.

---

### 9.5 Google Fonts

External web fonts (`Inter`, `Outfit`) loaded via `<link>` tags from Google's CDN for modern, consistent typography across browsers and operating systems.

---

### 9.6 Font Awesome Icons

Icon library loaded via CDN (`cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`). Icons are used as `<i class="fa-solid fa-building"></i>` throughout the UI for visual clarity.

---

## 10. Security Concepts

### 10.1 Password Hashing (bcrypt)
Passwords are never stored in plain text. They are hashed using bcrypt with salt rounds before saving to the database (see section 4.2).

### 10.2 JWT Token-Based Authentication
Stateless authentication where the server issues a signed token upon successful login. The token is validated on every protected API request (see section 4.1).

### 10.3 CORS (Cross-Origin Resource Sharing)
**Definition:** CORS is a browser security mechanism that restricts web pages from making requests to a different origin (domain, protocol, or port). The `cors()` middleware allows the server to specify which origins are permitted.

In this project, `cors({ origin: '*' })` allows requests from any origin (suitable for development; should be restricted in production).

### 10.4 Input Validation
- Server-side checks for required fields before database operations.
- File type validation in Multer (only images allowed).
- Client-side form validation (`required` attributes, password length checks).

### 10.5 Sensitive File Blocking
A custom middleware using regex blocks direct HTTP access to server-side files (`.env`, `server.js`, `models/`, `node_modules/`):
```js
const BLOCKED = /^\/(server\.js|seed\.js|\.env|package\.json|models|node_modules)/i;
```

### 10.6 Rate Limiting via `.limit()`
Database queries use `.limit(50)` or `.limit(100)` to prevent excessive data retrieval that could slow down the server or be exploited.

---

## Summary — Technology Stack Map

```
┌──────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  HTML5 · CSS3 · JavaScript (ES6+)                │
│  Glassmorphism · Responsive Design               │
│  Font Awesome · Google Fonts                     │
│  localStorage · sessionStorage · Fetch API       │
├──────────────────────────────────────────────────┤
│                   BACKEND                        │
│  Node.js · Express.js                            │
│  RESTful API · Middleware Chain                   │
│  JWT Authentication · bcrypt Hashing             │
│  Multer (File Upload) · Socket.IO (Real-Time)    │
│  dotenv (Environment Config)                     │
├──────────────────────────────────────────────────┤
│                   DATABASE                       │
│  MongoDB (NoSQL · Document DB)                   │
│  Mongoose (ODM · Schemas · Models)               │
│  MongoDB Atlas (Cloud Hosting)                   │
│  Replica Sets · BSON                             │
└──────────────────────────────────────────────────┘
```

---

> **Note:** This document covers the **theoretical concepts** behind every technology used in the Core Konstruct project. Each concept is explained in the context of how it is actually applied in the project's codebase.
