# Deployment (Render backend + Vercel frontend)

This file contains quick steps to deploy the Django backend to Render (or Heroku) and the Vite frontend to Vercel.

1) Backend (Render)

- Push project to a Git repo (GitHub/GitLab). On Render, create a new Web Service, connect the repo and branch.
- Set the build command: `pip install -r requirements.txt` (Render will run it automatically)
- Set the start command: `gunicorn Project.wsgi --log-file -`
- Set environment variables on Render:
  - `DJANGO_SECRET_KEY` — your secret
  - `DJANGO_DEBUG` — `False`
  - `DJANGO_ALLOWED_HOSTS` — comma-separated hosts (e.g. `your-service.onrender.com`)
  - `DATABASE_URL` — Render Postgres URL (create a Postgres add-on)
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — for media uploads
  - `FRONTEND_URL` — URL of your deployed frontend (used for CORS)

- After deploy, run migrations on Render: `python manage.py migrate` (use Render's shell or a one-off job).
- Collect static files: Render will run `collectstatic` during build if you call it; otherwise run `python manage.py collectstatic --noinput`.

2) Frontend (Vercel)

- In the `frontend/` folder, ensure `package.json` has `build` script (it already does: `vite build`).
- Import the repo into Vercel and set the root to `frontend/`.
- Build command: `npm run build` or `yarn build`.
- Output directory: `dist` (Vite default). Vercel will provide a domain and SSL.

3) Notes

- Media uploads: this project is configured to use Cloudinary. Please keep Cloudinary credentials in the environment.
- DB: SQLite is kept as a fallback; for production use Postgres via `DATABASE_URL`.
- Local testing: create a `.env` file (never commit it) and run the dev server with your local environment variables.

Windows / local development notes

- psycopg2-binary: This project uses `psycopg2-binary` for Postgres in production. On Windows, pip may try to build from source which requires Visual C++ Build Tools and PostgreSQL development headers/libraries. If you hit errors installing `psycopg2-binary` locally, use one of these options:
  1. Use SQLite locally (already configured as a fallback). No action required.
  2. Use WSL2 (recommended): install Ubuntu/WSL, then install `libpq-dev` and python-dev inside WSL and run pip there.
    - In WSL: `sudo apt update && sudo apt install -y libpq-dev build-essential python3-dev`
    - Then: `pip install -r requirements.txt` inside WSL.
  3. Install Visual Studio Build Tools and PostgreSQL (to provide libpq):
    - Install "Build Tools for Visual Studio" (C++ workload) from Microsoft.
    - Install PostgreSQL for Windows and ensure `include` and `lib` paths for libpq are available to the compiler.
  4. Use Docker for local development (recommended for parity): build the Docker image and run migrations inside the container; the container will have Linux build tools and install `psycopg2-binary` easily.

- For CI / production: keep `psycopg2-binary` enabled in `requirements.txt` (it will install prebuilt wheels on Render/Heroku/Linux environments).

CI recommendation

- Add a GitHub Actions workflow that runs `pip install -r requirements.txt` and `python manage.py check` and `python manage.py test` (optionally using the official Postgres service for integration tests). A starter workflow is included in this repository.

Render deploy secrets

- Create an API key on Render:
  1. Go to https://dashboard.render.com and sign in.
 2. Settings → API Keys → Create an API Key. Copy the value.
 3. In your GitHub repository, go to Settings → Secrets and variables → Actions → New repository secret.
   - Name: `RENDER_API_KEY`
   - Value: (the API key you copied)
 4. In Render, open your service and copy the Service ID from the URL or from the service settings (it's a UUID). Add it as a secret in GitHub:
   - Name: `RENDER_SERVICE_ID`
   - Value: (the service id)

Vercel deploy secrets (optional)

- If you want CI to deploy the frontend to Vercel instead of using Vercel's Git integration, create a Vercel token:
  1. Go to https://vercel.com/, sign in, then Settings → Tokens → Create.
 2. Copy the token value and save it to GitHub secrets as `VERCEL_TOKEN`.
 3. (Optional) If you need to pin the deployment to a specific project/org, add `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` as repository secrets. These are visible in your Vercel project settings.

Notes

- The CI workflow will fail the deploy steps if required secrets are not present. If you prefer, connect your Git repo directly in Render and Vercel dashboards for automatic deploys and skip CI-driven deploys.
