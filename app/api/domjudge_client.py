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
