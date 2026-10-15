# Student Information Management System (SIMS)

A minimal, robust, and functional Student Information Management System built with a vanilla frontend, Express.js REST API, and MongoDB Atlas.

---

## 1. Tech Stack

- **Frontend**: Semantic HTML5, CSS3, Vanilla JavaScript (ES6+). Zero frameworks or heavy external UI dependencies.
- **Backend**: Node.js & Express.js.
- **Database**: MongoDB Atlas with official Mongoose ODM.
- **Frontend Hosting Target**: Netlify.
- **Backend Hosting Target**: Render.

---

## 2. Project Directory Structure

```text
student-management-system/
├── frontend/
│   ├── index.html         # User interface structure and semantic layout
│   ├── style.css          # Responsive design, theme, modals, and toasts
│   └── script.js          # API client, validation, state, and DOM handling
├── backend/
│   ├── server.js          # Express app, Mongoose schemas, routes & CORS
│   ├── test-api.js        # Automated API test suite and health verification
│   ├── package.json       # Dependencies and npm scripts
│   ├── .env.example       # Template for environment configuration
│   └── .gitignore         # Backend secret and node_modules exclusions
├── screenshots/           # Directory for application submission screenshots
│   └── README.md
├── netlify.toml           # Netlify build & publish configuration
├── .gitignore             # Root repository gitignore
└── README.md              # Project documentation and setup guide
```

---

## 3. Features Implemented

1. **Student Directory & Management**:
   - **Add Student**: Form with fields for `studentId`, `name`, `email`, `department`, `semester`, and `contact`.
   - **Student Directory Table**: View all student records sorted chronologically.
   - **Real-Time Search**: Search student records by Student ID, name, email, or department with instant debounced filtering.
   - **Edit Student Details**: Click edit to populate the form, switch to update mode, and save changes.
   - **Delete Student**: Confirmation modal to prevent accidental student record deletions.
2. **Robust Validation**:
   - **Client-Side Validation**: Ensures non-empty inputs, valid email format, semester between 1 and 8, and 7-15 digit contact numbers with real-time feedback.
   - **Server-Side Validation**: Enforces strict schema constraints, data sanitization, type safety, and unique Student ID checks.
3. **Database Availability & Safe Fallbacks**:
   - Detects if MongoDB is connected.
   - If `MONGODB_URI` is missing or the database is down, the backend stays online and safely returns HTTP `503 Service Unavailable` with friendly explanations, rather than crashing or faking persistence with temporary in-memory arrays.
   - Frontend displays persistent health badges and alert banners guiding setup.
4. **Security & Production Readiness**:
   - Secure CORS configured to restrict unauthorized origins in production while supporting local development.
   - Sensitive database credentials sanitized from logs and error payloads.
   - HTML escaping to protect against XSS injections.

---

## 4. API Endpoints

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/health` | Server and database health status | `200` |
| `GET` | `/api/students` | Get all students or search with `?search=query` | `200`, `503` |
| `GET` | `/api/students/:id` | Get single student by MongoDB `_id` | `200`, `400`, `404`, `503` |
| `POST` | `/api/students` | Add a new student | `201`, `400`, `409`, `503` |
| `PUT` | `/api/students/:id` | Update student details by MongoDB `_id` | `200`, `400`, `404`, `409`, `503` |
| `DELETE` | `/api/students/:id` | Remove student record by MongoDB `_id` | `200`, `400`, `404`, `503` |

### Student Data Model
```json
{
  "_id": "670c5e7b8f9e123456789abc",
  "studentId": "STU-2024-001",
  "name": "Jane Doe",
  "email": "jane.doe@university.edu",
  "department": "Computer Science",
  "semester": 4,
  "contact": "+1 555-0199",
  "createdAt": "2026-10-14T17:00:00.000Z",
  "updatedAt": "2026-10-14T17:00:00.000Z"
}
```

---

## 5. Local Setup & Running Instructions

### Prerequisites
- Node.js (v18.x or v20.x+)
- npm (v9.x+)
- Modern web browser (Chrome, Edge, Firefox, Safari)

### Step 1: Install Backend Dependencies
Open your terminal in the project root:
```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to create your local `.env` file:
```bash
# On Windows PowerShell
Copy-Item .env.example .env

# On macOS / Linux
cp .env.example .env
```
Open `backend/.env` in your editor:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/student_db?retryWrites=true&w=majority
FRONTEND_URL=http://localhost:3000
```
*(See section 6 below for exact MongoDB Atlas setup steps to get your `MONGODB_URI`)*.

### Step 3: Start the Backend Server
```bash
npm start
```
The server will start at: `http://localhost:5000`
Health endpoint: `http://localhost:5000/api/health`

### Step 4: Run the Automated Verification Suite
In a new terminal window:
```bash
cd backend
npm test
```

### Step 5: Open the Frontend
Since the frontend uses vanilla HTML/CSS/JS, you can run it using any static server or simply open the file in your browser:
- **Option A (Python static server)**:
  ```bash
  python -m http.server 3000 --directory frontend
  ```
  Open `http://localhost:3000` in your browser.
- **Option B (Direct browser file open)**:
  Double click `frontend/index.html` or open it directly in your browser. The application automatically detects local development and targets `http://localhost:5000/api`.

---

## 6. MongoDB Atlas Setup Guide (Step-by-Step)

Follow these steps to obtain a free cloud database connection string:

### Step 1: Create an Account
1. Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and sign up for a free account (or log in).

### Step 2: Create a Free Cluster
1. On the Atlas dashboard, click **"Create"** or **"Build a Database"**.
2. Select the **M0 Free (Shared)** tier.
3. Choose your preferred cloud provider (AWS, GCP, or Azure) and the region closest to you.
4. Set a cluster name (e.g. `Cluster0`) and click **"Create Deployment"**.

### Step 3: Create a Database User
1. Under **Security** in the left menu, click **Database Access**.
2. Click **"Add New Database User"**.
3. Authentication Method: **Password**.
4. Set a username (e.g., `student_admin`) and a secure password.
   > **Note**: Avoid special characters like `@`, `:`, `/`, or `%` in your password, or URL-encode them.
5. Set Database User Privileges to **"Read and write to any database"**.
6. Click **"Add User"**.

### Step 4: Configure Network Access (IP Whitelist)
1. In the left menu under **Security**, click **Network Access**.
2. Click **"Add IP Address"**.
3. Click **"Allow Access From Anywhere"** (adds `0.0.0.0/0`).
   > *Why? This allows both your local development environment and your hosted Render backend to connect without IP restrictions.*
4. Click **"Confirm"**. Wait ~1 minute until the status displays "Active".

### Step 5: Obtain the Connection String
1. In the left menu, click **Database** (under Deployment).
2. Click the **"Connect"** button next to your cluster.
3. Select **"Drivers"** (Node.js).
4. Copy the connection string provided. It looks like:
   ```text
   mongodb+srv://student_admin:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
5. Replace `<password>` with your actual database user password.
6. Specify the database name before the `?` query parameters (e.g., `/student_db`):
   ```text
   mongodb+srv://student_admin:MyPassword123@cluster0.xxxx.mongodb.net/student_db?retryWrites=true&w=majority
   ```

### Step 6: Add to `backend/.env`
Paste the final connection string into your `backend/.env` file:
```env
MONGODB_URI=mongodb+srv://student_admin:MyPassword123@cluster0.xxxx.mongodb.net/student_db?retryWrites=true&w=majority
```

### Step 7: Verify Database Connectivity
Restart the backend and run the test suite:
```bash
cd backend
npm test
```
All 6 tests and the live CRUD suite will execute and report `✅ PASS`.

---

## 7. Deployment Guide

### A. Deploy Backend to Render

1. Push your repository to GitHub (**Ensure `backend/.env` is NOT committed**).
2. Log in to [Render](https://render.com/).
3. Click **"New +"** and choose **"Web Service"**.
4. Connect your GitHub repository.
5. Configure the service:
   - **Name**: `student-management-api`
   - **Language**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
6. Add **Environment Variables** in Render:
   - `MONGODB_URI`: `<Your MongoDB Atlas connection string>`
   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: Leave empty initially or set to your Netlify URL once created.
7. Click **"Deploy Web Service"**.
8. Once deployed, copy your public Render URL (e.g. `https://student-management-api.onrender.com`).
9. Test the live health endpoint in your browser: `https://student-management-api.onrender.com/api/health`.

### B. Deploy Frontend to Netlify

1. In `frontend/script.js`, locate the `RENDER_API_URL` constant at the top of the file:
   ```javascript
   // Change:
   const RENDER_API_URL = 'https://REPLACE_WITH_YOUR_RENDER_BACKEND_URL/api';

   // To your actual Render URL:
   const RENDER_API_URL = 'https://student-management-api.onrender.com/api';
   ```
2. Commit and push this change to your repository.
3. Log in to [Netlify](https://www.netlify.com/).
4. Click **"Add new site"** -> **"Import an existing project"**.
5. Connect your GitHub repository.
6. Build settings:
   - **Base directory**: Leave blank
   - **Publish directory**: `frontend` *(already defined in `netlify.toml`)*
   - **Build command**: Leave blank (static HTML/CSS/JS)
7. Click **"Deploy site"**.
8. After deployment, copy your Netlify site URL (e.g., `https://my-student-mgmt.netlify.app`).

### C. Finalize CORS Security on Render

1. Return to your Render dashboard -> Your backend service -> **Environment**.
2. Set `FRONTEND_URL` to your Netlify public URL:
   ```env
   FRONTEND_URL=https://my-student-mgmt.netlify.app
   ```
3. Save changes. Render will automatically redeploy with CORS restricted to your Netlify domain.

---

## 8. Verification & Screenshots

Before submitting your project:
1. Open your deployed Netlify application.
2. Add 2-3 sample students.
3. Test search by ID and by name.
4. Test editing a student's semester or contact details.
5. Test deleting a student record.
6. Capture screenshots of each action and save them in the `screenshots/` directory.
