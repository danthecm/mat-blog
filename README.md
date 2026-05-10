# mat-blog Fullstack Project

A complete fullstack blogging platform.

## Architecture

This is a monorepo containing both the frontend and backend applications:

- **[Frontend](./frontend/README.md):** A modern, responsive web application built with Next.js 14, Tailwind CSS, SWR, and React.
- **[Backend](./backend/README.md):** A RESTful API built with Django 6 and Django REST Framework, featuring JWT authentication and Cloudinary image storage.

## Getting Started

To run the project locally, you will need to set up both the backend API and the frontend application.

1. **Start the Backend:**
   Navigate to the `backend/` directory, set up your Python virtual environment, install dependencies, apply migrations, and run the Django server. (See [Backend README](./backend/README.md))

2. **Start the Frontend:**
   Navigate to the `frontend/` directory, install node modules, and start the Next.js development server on port 3000. (See [Frontend README](./frontend/README.md))
