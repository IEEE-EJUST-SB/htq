from app.api.domjudge_client import DOMjudgeClient
import json

try:
    client = DOMjudgeClient()
    teams = client.get_teams()
    print(json.dumps(teams, indent=2))
except Exception as e:
    print(f"Error: {e}")
