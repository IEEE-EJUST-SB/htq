import requests
from requests.auth import HTTPBasicAuth
import json
from app.config import settings

BASE_URL = settings.DOMJUDGE_API_URL.rstrip('/')
USER = settings.DOMJUDGE_USER
PASS = settings.DOMJUDGE_PASS
CONTEST_ID = "demo"

def verify_enrollment():
    print(f"Checking teams in contest '{CONTEST_ID}'...")
    url = f"{BASE_URL}/contests/{CONTEST_ID}/teams"
    try:
        r = requests.get(url, auth=HTTPBasicAuth(USER, PASS))
        r.raise_for_status()
        teams = r.json()
        
        print(f"Found {len(teams)} teams in contest '{CONTEST_ID}':")
        found = False
        for team in teams:
            t_id = team.get('id')
            t_name = team.get('name')
            print(f" - ID: {t_id}, Name: {t_name}")
            
        return teams
    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == "__main__":
    verify_enrollment()
