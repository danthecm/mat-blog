# mat-blog Backend API

This is the backend API for the mat-blog project, built with Django 6 and Django REST Framework.

## Features
- **Django REST Framework (DRF):** Robust API development and endpoints.
- **JWT Authentication:** Secure user authentication using `djangorestframework_simplejwt`.
- **Cloudinary Integration:** Image uploading and remote media management.
- **API Documentation:** Auto-generated structured endpoints using `drf-spectacular` (Swagger/OpenAPI).
- **Core Apps:** 
  - `blog`: Blog posts, tags, categories.
  - `engagement`: User interactions, comments, likes.
  - `newsroom`: News and site updates.
  - `user`: Custom user models and management.

## Setup Instructions

1. **Environment Setup:**
   Ensure you have Python installed. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Database Setup:**
   Apply the existing migrations to your SQLite database:
   ```bash
   python manage.py migrate
   ```

4. **Run Server:**
   Start the local development server:
   ```bash
   python manage.py runserver
   ```
