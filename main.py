from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy.orm import Session
import requests

from app.api.ctfd_client import CTFdClient
from app.api.domjudge_client import DOMjudgeClient
from app.db.database import get_db, engine, Base
from app.db import models
from change_team_category import change_team_category

Base.metadata.create_all(bind=engine)

app = FastAPI()
templates = Jinja2Templates(directory="app/templates")

ctfd_client = CTFdClient()
domjudge_client = DOMjudgeClient()


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------

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
        content={
            "error": f"Connection error: {exc}",
            "detail": "Could not connect to the external platform. Check if it is running and the URL is correct.",
        },
    )


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class TeamLinkCreate(BaseModel):
    ctfd_team_id: int
    ctfd_team_name: str
    domjudge_team_id: str
    domjudge_team_name: str


class ProblemLinkCreate(BaseModel):
    ctfd_challenge_id: int
    ctfd_challenge_name: str
    domjudge_contest_id: str
    domjudge_contest_name: Optional[str] = None


# ---------------------------------------------------------------------------
# UI
# ---------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# ---------------------------------------------------------------------------
# CTFd proxy routes
# ---------------------------------------------------------------------------

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
    kwargs = {
        k: v
        for k, v in {
            "challenge_id": challenge_id,
            "user_id": user_id,
            "team_id": team_id,
            "type": type,
        }.items()
        if v is not None
    }
    return ctfd_client.get_submissions(**kwargs)


# ---------------------------------------------------------------------------
# DOMjudge proxy routes
# ---------------------------------------------------------------------------

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
async def get_domjudge_contest_submissions(
    contest_id: str, problem_id: str = None, team_id: str = None
):
    params = {}
    if problem_id:
        params["problem_id"] = problem_id
    if team_id:
        params["team_id"] = team_id
    return domjudge_client.get_contest_submissions(contest_id, **params)


# ---------------------------------------------------------------------------
# Team Links CRUD
# ---------------------------------------------------------------------------

@app.get("/api/links/teams")
def list_team_links(db: Session = Depends(get_db)):
    links = db.query(models.TeamsLink).all()
    return [
        {
            "id": l.id,
            "ctfd_team_id": l.ctfd_team_id,
            "ctfd_team_name": l.ctfd_team_name,
            "domjudge_team_id": l.domjudge_team_id,
            "domjudge_team_name": l.domjudge_team_name,
        }
        for l in links
    ]


@app.post("/api/links/teams", status_code=201)
def create_team_link(payload: TeamLinkCreate, db: Session = Depends(get_db)):
    if db.query(models.TeamsLink).filter(
        models.TeamsLink.ctfd_team_id == payload.ctfd_team_id
    ).first():
        raise HTTPException(status_code=409, detail="CTFd team already linked.")
    if db.query(models.TeamsLink).filter(
        models.TeamsLink.domjudge_team_id == payload.domjudge_team_id
    ).first():
        raise HTTPException(status_code=409, detail="DOMjudge team already linked.")

    link = models.TeamsLink(
        ctfd_team_id=payload.ctfd_team_id,
        ctfd_team_name=payload.ctfd_team_name,
        domjudge_team_id=payload.domjudge_team_id,
        domjudge_team_name=payload.domjudge_team_name,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return {"id": link.id, **payload.model_dump()}


@app.delete("/api/links/teams/{link_id}", status_code=200)
def delete_team_link(link_id: int, db: Session = Depends(get_db)):
    link = db.query(models.TeamsLink).filter(models.TeamsLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Team link not found.")
    db.delete(link)
    db.commit()
    return {"detail": "Deleted."}


# ---------------------------------------------------------------------------
# Problem Links CRUD
# ---------------------------------------------------------------------------

@app.get("/api/links/problems")
def list_problem_links(db: Session = Depends(get_db)):
    links = db.query(models.ProblemLink).all()
    return [
        {
            "id": l.id,
            "ctfd_challenge_id": l.ctfd_challenge_id,
            "ctfd_challenge_name": l.ctfd_challenge_name,
            "domjudge_contest_id": l.domjudge_contest_id,
            "domjudge_contest_name": l.domjudge_contest_name,
        }
        for l in links
    ]


@app.post("/api/links/problems", status_code=201)
def create_problem_link(payload: ProblemLinkCreate, db: Session = Depends(get_db)):
    if db.query(models.ProblemLink).filter(
        models.ProblemLink.ctfd_challenge_id == payload.ctfd_challenge_id
    ).first():
        raise HTTPException(status_code=409, detail="CTFd challenge already linked.")

    link = models.ProblemLink(
        ctfd_challenge_id=payload.ctfd_challenge_id,
        ctfd_challenge_name=payload.ctfd_challenge_name,
        domjudge_contest_id=payload.domjudge_contest_id,
        domjudge_contest_name=payload.domjudge_contest_name,
        domjudge_problem_id="",  # Deprecated
        domjudge_problem_name="",  # Deprecated
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return {"id": link.id, **payload.model_dump()}


@app.delete("/api/links/problems/{link_id}", status_code=200)
def delete_problem_link(link_id: int, db: Session = Depends(get_db)):
    link = db.query(models.ProblemLink).filter(models.ProblemLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Problem link not found.")
    db.delete(link)
    db.commit()
    return {"detail": "Deleted."}


# ---------------------------------------------------------------------------
# Sync: detect CTFd solves → enroll DOMjudge teams
# ---------------------------------------------------------------------------

@app.post("/api/sync")
def run_sync(db: Session = Depends(get_db)):
    """
    Poll CTFd for all correct submissions.
    For each submission where:
      - the challenge has a ProblemLink, AND
      - the submitting team has a TeamsLink
    enroll the linked DOMjudge team into the linked DOMjudge contest.
    Already-processed submissions are skipped (idempotent).
    """
    raw = ctfd_client.get_submissions(type="correct")
    submissions = raw.get("data", []) if isinstance(raw, dict) else raw

    results = []

    for sub in submissions:
        sub_id = sub.get("id")
        challenge_id = sub.get("challenge_id") or (sub.get("challenge") or {}).get("id")
        team_id = sub.get("team_id") or (sub.get("team") or {}).get("id")

        if sub_id is None or challenge_id is None or team_id is None:
            continue

        # Skip already processed submissions
        if db.query(models.Enrollment).filter(
            models.Enrollment.ctfd_submission_id == sub_id,
            models.Enrollment.status == "success"  # Only skip if previous attempt was successful
        ).first():
            continue

        problem_link = db.query(models.ProblemLink).filter(
            models.ProblemLink.ctfd_challenge_id == challenge_id
        ).first()
        if not problem_link:
            continue

        team_link = db.query(models.TeamsLink).filter(
            models.TeamsLink.ctfd_team_id == team_id
        ).first()
        if not team_link:
            continue

        status = "success"
        error_msg = None
        try:
            # Instead of adding team to contest via API, we change its category directly via DB/Docker
            success, err = change_team_category(team_link.domjudge_team_id, 2)
            if not success:
                status = "error"
                error_msg = err
            else:
                status = "success"

        except Exception as exc:
            status = "error"
            error_msg = str(exc)

        enrollment = models.Enrollment(
            ctfd_submission_id=sub_id,
            ctfd_team_id=team_id,
            ctfd_team_name=team_link.ctfd_team_name,
            ctfd_challenge_id=challenge_id,
            ctfd_challenge_name=problem_link.ctfd_challenge_name,
            domjudge_team_id=team_link.domjudge_team_id,
            domjudge_team_name=team_link.domjudge_team_name,
            domjudge_contest_id=problem_link.domjudge_contest_id,
            status=status,
            error_message=error_msg,
        )
        db.add(enrollment)
        db.commit()

        results.append(
            {
                "submission_id": sub_id,
                "ctfd_team": team_link.ctfd_team_name,
                "ctfd_challenge": problem_link.ctfd_challenge_name,
                "domjudge_team": team_link.domjudge_team_name,
                "domjudge_contest": problem_link.domjudge_contest_id,
                "status": status,
                "error": error_msg,
            }
        )

    return {"processed": len(results), "results": results}


@app.get("/api/sync/log")
def get_sync_log(db: Session = Depends(get_db)):
    enrollments = (
        db.query(models.Enrollment)
        .order_by(models.Enrollment.enrolled_at.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id": e.id,
            "ctfd_submission_id": e.ctfd_submission_id,
            "ctfd_team": e.ctfd_team_name,
            "ctfd_challenge": e.ctfd_challenge_name,
            "domjudge_team": e.domjudge_team_name,
            "domjudge_contest": e.domjudge_contest_id,
            "status": e.status,
            "error": e.error_message,
            "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
        }
        for e in enrollments
    ]
