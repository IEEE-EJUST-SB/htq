import requests
from requests.auth import HTTPBasicAuth
import json
from app.config import settings

BASE_URL = settings.DOMJUDGE_API_URL.rstrip('/')
USER = settings.DOMJUDGE_USER
PASS = settings.DOMJUDGE_PASS
CONTEST_ID = "demo"
TEAM_ID_EXT = "domjudge"
TEAM_ID_INT = 1

def try_add(payload):
    print(f"Trying payload: {payload}")
    try:
        r = requests.post(
            f"{BASE_URL}/contests/{CONTEST_ID}/teams",
            auth=HTTPBasicAuth(USER, PASS),
            json=payload
        )
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text}")
    except Exception as e:
        print(f"Error: {e}")
    print("-" * 20)

# Try 1: Current implementation (id as string)
try_add({"id": str(TEAM_ID_EXT)})

# Try 2: Numeric ID as string
try_add({"id": str(TEAM_ID_INT)})

# Try 3: Numeric ID as integer
try_add({"id": TEAM_ID_INT})

# Try 4: team_id parameter
try_add({"team_id": str(TEAM_ID_EXT)})

# Try 5: team_id parameter numeric
try_add({"team_id": TEAM_ID_INT})
