from fastapi import FastAPI, Depends, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
import requests

from app.api.ctfd_client import CTFdClient
from app.api.domjudge_client import DOMjudgeClient
from app.db.database import get_db, engine, Base
from app.db import models

Base.metadata.create_all(bind=engine)

app = FastAPI()
templates = Jinja2Templates(directory="app/templates")

ctfd_client = CTFdClient()
domjudge_client = DOMjudgeClient()

@app.exception_handler(requests.exceptions.HTTPError)
async def http_error_handler(request: Request, exc: requests.exceptions.HTTPError):
    return JSONResponse(
        status_code=exc.response.status_code,
        content={"error": str(exc), "detail": exc.response.text},
    )

@app.exception_handler(requests.exceptions.ConnectionError)
async def connection_error_handler(request: Request, exc: requests.exceptions.ConnectionError):
    return JSONResponse(
        status_code=503,
        content={"error": f"Connection error: {exc}", "detail": "Could not connect to the external platform. Check if it is running and the URL is correct."},
    )

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/ctfd/challenges")
async def get_ctfd_challenges():
    return ctfd_client.get_challenges()

@app.get("/api/ctfd/teams")
async def get_ctfd_teams():
    return ctfd_client.get_teams()

@app.get("/api/ctfd/submissions")
async def get_ctfd_submissions(
    challenge_id: int = None,
    user_id: int = None,
    team_id: int = None,
    type: str = None,
):
    kwargs = {k: v for k, v in {"challenge_id": challenge_id, "user_id": user_id, "team_id": team_id, "type": type}.items() if v is not None}
    return ctfd_client.get_submissions(**kwargs)

@app.get("/api/domjudge/contests")
async def get_domjudge_contests():
    return domjudge_client.get_contests()

@app.get("/api/domjudge/contests/{contest_id}/problems")
async def get_domjudge_contest_problems(contest_id: str):
    return domjudge_client.get_contest_problems(contest_id)

@app.get("/api/domjudge/teams")
async def get_domjudge_teams():
    return domjudge_client.get_teams()

@app.get("/api/domjudge/contests/{contest_id}/submissions")
async def get_domjudge_contest_submissions(contest_id: str, problem_id: str = None, team_id: str = None):
    params = {}
    if problem_id: params["problem_id"] = problem_id
    if team_id: params["team_id"] = team_id
    return domjudge_client.get_contest_submissions(contest_id, **params)
