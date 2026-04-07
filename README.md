# Noise Stress Mapping System

A full-stack web application for recording, mapping, and reviewing environmental noise and stress-related observations.

The project helps users:
- capture geotagged noise readings
- attach notes and audio evidence to incidents
- visualize stress patterns on an interactive map
- review nearby community reports
- generate locality-level summaries for reporting and decision-making

## Tech Stack

- Frontend: React.js + Vite
- Backend: FastAPI
- Database: PostgreSQL via Supabase
- ORM: SQLAlchemy
- Auth: JWT-based authentication
- Mapping: Leaflet + React Leaflet

Note:
- The backend is set up to use `DATABASE_URL` from `.env` for PostgreSQL/Supabase.
- If `DATABASE_URL` is not provided, it falls back to a local SQLite database.

## Project Structure

```text
Noise-Stress-Mapping-System/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── auth.py
│   │   └── utils.py
│   ├── scripts/
│   └── uploads/
├── frontend/
│   ├── public/
│   └── src/
├── requirements.txt
└── .env
```

## Prerequisites

Make sure you have the following installed:

- Git
- Node.js and npm
- Python 3.10+
- `venv` support for Python

## Clone The Repository

```bash
git clone https://github.com/nil-aa/Noise-Stress-Mapping-System.git
cd Noise-Stress-Mapping-System
```

## Environment Variables

Create a `.env` file in the project root if you do not already have one.

Example:

```env
SECRET_KEY=your_access_secret
REFRESH_SECRET_KEY=your_refresh_secret
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
DATABASE_URL=postgresql://username:password@host:5432/postgres
```

If you are using Supabase, `DATABASE_URL` should be your Supabase PostgreSQL connection string.

## Frontend Setup

Open a terminal in the project root and run:

```bash
cd frontend
npm install
npm run dev
```

The frontend will typically start on:

```text
http://localhost:5173
```

## Backend Setup

Open a second terminal in the project root and run:

```bash
python -m venv .venv
```

Activate the virtual environment.

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Windows Command Prompt:

```cmd
.venv\Scripts\activate
```

macOS / Linux:

```bash
source .venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI backend:

```bash
uvicorn backend.app.main:app --reload
```

The backend will typically start on:

```text
http://127.0.0.1:8000
```

## Running The Full Project

You need two terminals running at the same time:

1. Frontend

```bash
cd frontend
npm run dev
```

2. Backend

```bash
.venv\Scripts\Activate.ps1
uvicorn backend.app.main:app --reload
```

Then open the app in your browser at:

```text
http://localhost:5173
```

## Main Features

- User registration and login
- Noise reading submission with geolocation
- Audio upload support for recorded incidents
- Personal and community reading views
- Heatmap-based visualization of stress intensity
- Locality-based stress estimation
- Locality report generation
- Evidence page for reviewing saved notes and audio

## API Notes

The backend exposes endpoints for:

- authentication
- submitting readings
- uploading reading audio
- retrieving personal and community readings
- heatmap generation
- stress prediction
- locality report generation

Static uploaded audio is served from:

```text
/uploads
```

## Development Notes

- Frontend routing is handled with `react-router-dom`.
- The map interface uses Leaflet and React Leaflet.
- Audio files uploaded through the backend are stored under `backend/uploads/audio`.
- Database tables are initialized automatically when the backend starts.

## Troubleshooting

### Frontend does not start

- Make sure you are inside the `frontend` folder.
- Make sure dependencies are installed with `npm install`.

### Backend does not start

- Make sure the virtual environment is activated.
- Make sure dependencies are installed with `pip install -r requirements.txt`.
- Make sure your `.env` file contains valid keys and database configuration.

### Database connection issues

- Verify that `DATABASE_URL` is correct.
- If using Supabase, ensure the connection string, password, host, and SSL requirements are valid.

## License

This project is licensed under the terms of the included [LICENSE](LICENSE).
