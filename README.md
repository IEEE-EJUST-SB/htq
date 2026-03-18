# CTFd & DOMjudge Bridge

This server bridges **CTFd** and **DOMjudge**. When a team solves a specific challenge in CTFd, they are automatically enrolled into a linked DOMjudge contest.

The enrollment is performed by changing the team's category in the DOMjudge database (running in Docker) to `2` (Participants).

## Setup

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Docker Requirement**:
   This application requires access to the Docker socket to communicate with the DOMjudge database container. Ensure the user running the script has permission to access Docker (e.g., is in the `docker` group).

3. **Run the server**:
   Since CTFd often runs on port 8000, we recommend running this bridge on port **5000**:
   ```bash
   uvicorn main:app --reload --port 5000
   ```

4. **Open the Admin UI**:
   Visit [http://localhost:5000](http://localhost:5000).

## Configuration

The server defaults to:
- **CTFd**: `http://localhost:8000/api/v1`
- **DOMjudge**: `http://localhost/api/v4`

To override defaults, create a `.env` file:
```bash
CTFD_API_URL=http://localhost:8000/api/v1
CTFD_API_TOKEN=your_ctfd_token
DOMJUDGE_API_URL=http://localhost/api/v4
DOMJUDGE_USER=admin
DOMJUDGE_PASS=your_password
DATABASE_URL=sqlite:///./bridge.db
```

## How It Works

The DOMjudge scoreboard proxy supports `?sortorder=` (e.g. `1` and `11`) to match different public ranking modes:  
`GET /api/domjudge/contests/{contest_id}/scoreboard?sortorder=1` and `...?sortorder=11`.

1. **Link Teams**: Map a CTFd team to a DOMjudge team via the UI.
2. **Link Problem**: Map a CTFd challenge to a DOMjudge contest.
3. **Sync**:
   - The bridge polls CTFd for correct submissions.
   - If a submission matches a linked challenge and team, it triggers the enrollment.
   - Enrollment is done by executing a database update inside the `mariadb` container to set the team's category to `2` (Participants).
