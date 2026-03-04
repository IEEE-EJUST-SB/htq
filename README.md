# CTFd & DOMjudge Bridge

This server bridges **CTFd** and **DOMjudge**. When a team solves a specific challenge in CTFd, they are automatically enrolled into a linked DOMjudge contest.

## Setup

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the server**:
   Since CTFd often runs on port 8000, we recommend running this bridge on port **8080**:
   ```bash
   uvicorn main:app --reload --port 8080
   ```

3. **Open the Admin UI**:
   Visit [http://localhost:8080](http://localhost:8080).

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
