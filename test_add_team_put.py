import requests
from requests.auth import HTTPBasicAuth
from app.config import settings

BASE_URL = settings.DOMJUDGE_API_URL.rstrip('/')
USER = settings.DOMJUDGE_USER
PASS = settings.DOMJUDGE_PASS
CONTEST_ID = "demo"
TEAM_ID_EXT = "domjudge"
TEAM_ID_INT = 1

def try_put(url):
    print(f"Trying PUT: {url}")
    try:
        r = requests.put(
            url,
            auth=HTTPBasicAuth(USER, PASS),
            # Empty body or simple update
        )
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text}")
    except Exception as e:
        print(f"Error: {e}")
    print("-" * 20)

try_put(f"{BASE_URL}/contests/{CONTEST_ID}/teams/{TEAM_ID_EXT}")
try_put(f"{BASE_URL}/contests/{CONTEST_ID}/teams/{TEAM_ID_INT}")
