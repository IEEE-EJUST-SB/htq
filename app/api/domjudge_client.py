import requests
from requests.auth import HTTPBasicAuth
from app.config import settings

class DOMjudgeClient:
    """
    Client for DOMjudge API v4 (CCS Contest API).
    Docs: https://ccs-specs.icpc.io/2021-11/contest_api
    """
    def __init__(self):
        self.base_url = settings.DOMJUDGE_API_URL.rstrip('/')
        self.user = settings.DOMJUDGE_USER
        self.password = settings.DOMJUDGE_PASS

    def _auth(self):
        return HTTPBasicAuth(self.user, self.password)

    def _get_all(self, endpoint, params=None):
        """
        DOMjudge API v4 endpoints typically return full lists.
        Pagination is not standard in the spec for these endpoints.
        """
        if params is None:
            params = {}
            
        response = requests.get(f"{self.base_url}/{endpoint}", auth=self._auth(), params=params)
        response.raise_for_status()
        return response.json()

    def get_contests(self):
        return self._get_all("contests")

    def get_contest_problems(self, contest_id: str):
        # Endpoint: /contests/{cid}/problems
        return self._get_all(f"contests/{contest_id}/problems")

    def get_teams(self):
        return self._get_all("teams")

    def get_contest_submissions(self, contest_id: str, **params):
        # Endpoint: /contests/{cid}/submissions
        # Supports filtering e.g. language_id, problem_id, team_id
        return self._get_all(f"contests/{contest_id}/submissions", params)

    def add_team_to_contest(self, contest_id: str, team_id, team_name=None) -> dict:
        """
        Add a team to a DOMjudge contest.
        Uses POST /contests/{cid}/teams — a DOMjudge admin extension.
        Returns empty dict if the response body is empty (e.g. 204 No Content).
        Raises requests.HTTPError on failure.
        """
        payload = {"id": str(team_id)}
        if team_name:
            payload["name"] = team_name
            
        response = requests.post(
            f"{self.base_url}/contests/{contest_id}/teams",
            auth=self._auth(),
            json=payload,
        )
        response.raise_for_status()
        return response.json() if response.content else {}
