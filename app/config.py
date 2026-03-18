import os
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv()


def _strip_api_path(url: str, suffix: str) -> str:
    u = url.rstrip("/")
    s = suffix.rstrip("/")
    if u.lower().endswith(s.lower()):
        return u[: -len(s)].rstrip("/") or u
    return u


def _browser_base_url(
    env_ui: str,
    api_url: str,
    api_suffix: str,
    default_local_port: int,
) -> str:
    """
    URLs for <a href> in the user's browser. CTFd/DOMjudge often run in other
    containers; the bridge may use host.docker.internal or service names for APIs,
    but the browser should use localhost (published ports) unless overridden.
    """
    explicit = (os.getenv(env_ui) or "").strip()
    if explicit:
        return explicit.rstrip("/")
    api = api_url
    parsed = urlparse(api)
    host = (parsed.hostname or "").lower()
    port = parsed.port

    # Container DNS on Docker networks (ctfd, domserver, or any single-label name)
    single_label = bool(host) and "." not in host and host not in ("localhost", "127")
    container_like = (
        "host.docker.internal" in api
        or host in ("ctfd", "domserver")
        or single_label
    )
    if container_like:
        p = port or default_local_port
        if p in (80, 443):
            return "http://localhost" if p == 80 else "https://localhost"
        return f"http://localhost:{p}"

    return _strip_api_path(api, api_suffix)


class Settings:
    # API URLs (server-side; may be host.docker.internal or container names)
    CTFD_API_URL: str = os.getenv("CTFD_API_URL", "http://localhost:8000/api/v1")
    DOMJUDGE_API_URL: str = os.getenv("DOMJUDGE_API_URL", "http://localhost/api/v4")

    # Where the browser opens CTFd / DOMjudge (separate containers → usually localhost + published ports)
    CTFD_UI_URL: str = _browser_base_url(
        "CTFD_UI_URL", CTFD_API_URL, "/api/v1", 8000
    )
    DOMJUDGE_UI_URL: str = _browser_base_url(
        "DOMJUDGE_UI_URL", DOMJUDGE_API_URL, "/api/v4", 80
    )

    # CTFd: create token in UI (admin) — each install has its own tokens
    CTFD_API_TOKEN: str = (os.getenv("CTFD_API_TOKEN") or "").strip()

    # DOMjudge: same as web login (HTTP Basic on /api/v4)
    DOMJUDGE_USER: str = (os.getenv("DOMJUDGE_USER") or "admin").strip()
    DOMJUDGE_PASS: str = (os.getenv("DOMJUDGE_PASS") or "").strip()

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./bridge.db")

settings = Settings()
