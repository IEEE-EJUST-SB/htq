import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # API URLs
    CTFD_API_URL: str = os.getenv("CTFD_API_URL", "http://localhost:8000/api/v1")
    DOMJUDGE_API_URL: str = os.getenv("DOMJUDGE_API_URL", "http://localhost/api/v4")

    # CTFd Credentials
    # The second argument to getenv is the default value if the env var is not set.
    # We use the token provided by the user as the default.
    CTFD_API_TOKEN: str = os.getenv("CTFD_API_TOKEN", "ctfd_e58c8168779ceb62c27298a63977cacc1e272a230628e7d7f4afc16d994f9cf5")

    # DOMjudge Credentials
    DOMJUDGE_USER: str = os.getenv("DOMJUDGE_USER", "admin")
    DOMJUDGE_PASS: str = os.getenv("DOMJUDGE_PASS", "Mohamed@1234")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./bridge.db")

settings = Settings()
