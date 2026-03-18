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

**CTFd and DOMjudge in Docker on the same machine (bridge on the host with uvicorn)**  
This is a common working layout: run the bridge with **uvicorn** on the host, CTFd and DOMjudge in separate containers with ports published (**8000** and **80**). In `.env` use **`http://localhost:8000/api/v1`** and **`http://localhost/api/v4`** — the host reaches the containers via those mapped ports. The Docker socket on the host still sees the **`mariadb`** container for team category sync.

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

### Fixing `401 Unauthorized`

| Error URL contains | Fix |
|--------------------|-----|
| `/api/v1` (CTFd) | Set **`CTFD_API_TOKEN`** in `.env` to an **admin** API token from CTFd (Profile → **Access Tokens**, generate with write/admin access). |
| `/api/v4` (DOMjudge) | Set **`DOMJUDGE_USER`** / **`DOMJUDGE_PASS`** to the same credentials as the DOMjudge **web login**. |

Then restart: `docker compose up -d` (or restart `uvicorn`).  
Test DOMjudge: `curl -u admin:YOURPASS -s -o /dev/null -w "%{http_code}\n" http://localhost/api/v4/contests` → should be **200**.

The admin page includes **Open CTFd** and **Open DOMjudge** links. With CTFd/DOMjudge in **other containers** on the same machine, API URLs often use `host.docker.internal` or a Compose service name; those links default to **`http://localhost:8000`** and **`http://localhost`** (published ports). Override with **`CTFD_UI_URL`** / **`DOMJUDGE_UI_URL`** if you use another host (e.g. a server IP or HTTPS).

## Docker

The bridge can run in a container. It still needs the **host Docker socket** so it can `docker exec` into the DOMjudge **MariaDB** container (expected name: `mariadb`).

### uvicorn works but Docker doesn’t (connection / timeout / 401)

Inside a container, **`localhost` is not your laptop** — it’s the bridge container. If `.env` has `CTFD_API_URL=http://localhost:8000/...` for uvicorn, **do not expect that to work in Docker.**

`docker-compose.yml` therefore sets API URLs to **`http://host.docker.internal:8000`** and **`http://host.docker.internal`** by default (needs Docker 20.10+ on Linux with `extra_hosts: host-gateway`). Tokens and passwords still come from `.env` (`CTFD_API_TOKEN`, `DOMJUDGE_PASS`).

If the bridge joins the same Compose network as CTFd/DOMjudge, set in `.env`:

`BRIDGE_CTFD_API_URL=http://ctfd:8000/api/v1` and `BRIDGE_DOMJUDGE_API_URL=http://domserver/api/v4` (adjust service names).

1. Copy `env.example` to `.env` and set URLs so the container can reach CTFd and DOMjudge on your machine (defaults use `host.docker.internal`).
2. Build and run:
   ```bash
   docker compose up -d --build
   ```
3. Open **http://localhost:5000** (change host port with `BRIDGE_PORT` in `.env` if needed).

SQLite data is stored in the `htq_data` volume (`/data/bridge.db` inside the container).

**Security:** Mounting `/var/run/docker.sock` gives the bridge container the same power as the Docker daemon on the host—use only in trusted environments.

### CTFd and DOMjudge in separate containers (same machine)

Containers talk to each other by **Docker network DNS** (service/container name), not `localhost`.

1. **Create a shared network** (once):  
   `docker network create ctf-stack`
2. **Attach** the CTFd container, DOMjudge web container, and the bridge to that network:
   - In each project’s `docker-compose.yml`, attach services to the shared network, e.g.:
     ```yaml
     services:
       ctfd:
         networks: [default, ctf-stack]
       # ... same for domjudge web + bridge via docker-compose.attach.yml
     networks:
       ctf-stack:
         external: true
         name: ctf-stack
     ```
   - Or after containers exist:  
     `docker network connect ctf-stack <container_name>` for each.
3. In **`.env`**, set URLs using **internal** hostnames and ports, e.g.  
   `CTFD_API_URL=http://ctfd:8000/api/v1`  
   `DOMJUDGE_API_URL=http://domserver:80/api/v4`  
   (use your real service names and ports from `docker compose ps` / their compose files.)
4. Set **`SHARED_DOCKER_NETWORK=ctf-stack`** in `.env`.
5. Start the bridge with the attach override:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.attach.yml up -d --build
   ```

The MariaDB container for DOMjudge must still be named **`mariadb`** (or update `change_team_category.py`) for category sync.

### Run on AWS EC2

Use this when CTFd, DOMjudge (with a Docker container named **`mariadb`**), and the bridge all run on the **same** EC2 instance—so the bridge can reach APIs on the host and use the Docker socket.

1. **Launch an instance** (e.g. Ubuntu 22.04), with enough RAM for your stack.
2. **Security group**: allow **SSH (22)** from your IP, and **TCP 5000** from where you need the UI (your IP, VPN, or `0.0.0.0/0` only if you accept the risk).
3. **SSH in** and install Docker (includes Compose V2):
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER
   ```
   Log out and SSH back in so your user can run `docker` without `sudo`.
4. **Deploy the bridge**:
   ```bash
   git clone <your-repo-url> htq && cd htq
   cp env.example .env
   nano .env   # set CTFD_API_TOKEN, DOMJUDGE_PASS, and URLs (see below)
   docker compose up -d --build
   ```
5. **Open the UI**: `http://<EC2_PUBLIC_IP>:5000`

**URLs in `.env` on EC2**

- If CTFd and DOMjudge are exposed on **this same server** (ports 8000 and 80), defaults in `env.example` (`host.docker.internal`) work with `extra_hosts` in Compose.
- If CTFd or DOMjudge are **elsewhere**, set full URLs, e.g. `CTFD_API_URL=https://ctf.yourdomain.com/api/v1`.

**Production tips**

- Put **nginx** (or ALB) in front with HTTPS and proxy to `127.0.0.1:5000` instead of exposing 5000 to the internet.
- Restrict security group **5000** to known IPs, or close it and only access via SSH tunnel:  
  `ssh -L 5000:127.0.0.1:5000 ubuntu@<EC2_IP>` then open `http://localhost:5000`.

## How It Works

The DOMjudge scoreboard proxy accepts optional `?sortorder=` (the UI uses `sortorder=1`).  
Example: `GET /api/domjudge/contests/{contest_id}/scoreboard?sortorder=1`.

1. **Link Teams**: Map a CTFd team to a DOMjudge team via the UI.
2. **Link Problem**: Map a CTFd challenge to a DOMjudge contest.
3. **Sync**:
   - The bridge polls CTFd for correct submissions.
   - If a submission matches a linked challenge and team, it triggers the enrollment.
   - Enrollment is done by executing a database update inside the `mariadb` container to set the team's category to `2` (Participants).
