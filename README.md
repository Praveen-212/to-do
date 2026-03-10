# AI To-Do Manager

A modern task management web application built using **HTML, TailwindCSS, JavaScript, and Supabase**.
The application allows users to manage daily tasks efficiently with authentication, task prioritization, filtering, and a responsive user interface.

---

## 🚀 Live Demo

Deployed using Netlify.

---

## 🛠 Tech Stack

Frontend

* HTML5
* TailwindCSS
* JavaScript

Backend

* Supabase (PostgreSQL Database)
* Supabase Authentication

Deployment

* Netlify

---

## ✨ Features

* User Authentication (Signup & Login)
* Add new tasks
* Edit existing tasks
* Delete tasks
* Mark tasks as completed
* Task priority levels (Low, Medium, High)
* Due date support
* Task search functionality
* Filter tasks (All / Completed / Pending)
* Dark mode toggle
* Responsive modern UI
* Real-time data storage using Supabase

---

## 📂 Project Structure

```
ai-todo-pro/
│
├── index.html
├── style.css
├── script.js
├── supabase.js
└── README.md
```

---

## 🗄 Database Schema

Table: **todos**

| Column     | Type      | Description      |
| ---------- | --------- | ---------------- |
| id         | bigint    | Primary key      |
| user_id    | uuid      | User identifier  |
| task       | text      | Task description |
| priority   | text      | Task priority    |
| due_date   | date      | Task deadline    |
| completed  | boolean   | Task status      |
| created_at | timestamp | Creation time    |

---

## ⚙️ Setup Instructions

### 1. Clone Repository

```
git clone https://github.com/your-username/ai-todo-pro.git
cd ai-todo-pro
```

---

### 2. Create Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Navigate to **SQL Editor** and create the `todos` table.

```
create table todos (
id bigint generated always as identity primary key,
user_id uuid,
task text,
priority text,
due_date date,
completed boolean default false,
created_at timestamp default now()
);
```

---

### 3. Configure Supabase

Get the following from **Project Settings → API**

* Project URL
* Public Anon Key

Add them in your JavaScript file.

---

### 4. Run the Application

Open the project in a browser.

```
open index.html
```

---

## 🌐 Deployment

The application is deployed using **Netlify**.

Steps:

1. Push project to GitHub
2. Go to Netlify
3. Import the repository
4. Deploy the site

---

## 📈 Future Improvements

* Drag and drop task management
* Task analytics dashboard
* Real-time updates
* Mobile application
* Push notifications

---

## 👨‍💻 Author

Praveen Reddy
BTech CSE – Data Science
Interested in Full Stack Development and AI-powered applications.
