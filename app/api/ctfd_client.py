"""
CTFd API v1 client - follows official Swagger spec.
Docs: https://docs.ctfd.io/docs/api/
"""
import requests
from app.config import settings


class CTFdClient:
    def __init__(self):
        self.base_url = settings.CTFD_API_URL.rstrip("/")
        self.token = settings.CTFD_API_TOKEN

    def _headers(self):
        return {
            "Authorization": f"Token {self.token}",
            "Content-Type": "application/json",
        } if self.token else {"Content-Type": "application/json"}

    def _get(self, endpoint: str, params=None):
        """GET request. Returns raw JSON. Raises on HTTP errors."""
        url = f"{self.base_url}/{endpoint}"
        params = params.copy() if params else {}
        params["view"] = "admin"
        response = requests.get(url, headers=self._headers(), params=params)
        response.raise_for_status()
        return response.json()

    def get_challenges(
        self,
        *,
        name: str = None,
        max_attempts: int = None,
        value: int = None,
        category: str = None,
        type: str = None,
        state: str = None,
        q: str = None,
        field: str = None,
    ):
        """
        GET /challenges - bulk list.
        Params per spec: name, max_attempts, value, category, type, state, q, field.
        Response: { success, data } (no pagination).
        """
        params = {k: v for k, v in locals().items() if k != "self" and v is not None}
        return self._get("challenges", params)

    def get_teams(
        self,
        *,
        affiliation: str = None,
        country: str = None,
        bracket: str = None,
        q: str = None,
        field: str = None,
    ):
        """
        GET /teams - bulk list.
        Params per spec: affiliation, country, bracket, q, field.
        Response: { success, data, meta: { pagination } }.
        """
        params = {k: v for k, v in locals().items() if k != "self" and v is not None}
        return self._get("teams", params)

    def get_submissions(
        self,
        *,
        challenge_id: int = None,
        user_id: int = None,
        team_id: int = None,
        ip: str = None,
        provided: str = None,
        type: str = None,
        q: str = None,
        field: str = None,
    ):
        """
        GET /submissions - bulk list.
        Params per spec: challenge_id, user_id, team_id, ip, provided, type, q, field.
        Response: { success, data, meta: { pagination } }.
        """
        params = {k: v for k, v in locals().items() if k != "self" and v is not None}
        return self._get("submissions", params)
