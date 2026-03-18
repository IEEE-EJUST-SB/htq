from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.db.database import Base


class TeamsLink(Base):
    __tablename__ = "teams_link"

    id = Column(Integer, primary_key=True, index=True)
    ctfd_team_id = Column(Integer, unique=True, index=True)
    ctfd_team_name = Column(String)
    domjudge_team_id = Column(Integer, unique=True, index=True)
    domjudge_team_name = Column(String)


class ProblemLink(Base):
    __tablename__ = "problem_links"

    id = Column(Integer, primary_key=True, index=True)
    ctfd_challenge_id = Column(Integer, unique=True, index=True)
    ctfd_challenge_name = Column(String)
    domjudge_contest_id = Column(String)
    domjudge_contest_name = Column(String, nullable=True)
    domjudge_problem_id = Column(String, nullable=True)
    domjudge_problem_name = Column(String, nullable=True)
    # DOMjudge team category to assign when this CTFd challenge is solved (see change_team_category)
    target_category_id = Column(Integer, nullable=False, default=2)


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    ctfd_submission_id = Column(Integer, unique=True, index=True)
    ctfd_team_id = Column(Integer)
    ctfd_team_name = Column(String, nullable=True)
    ctfd_challenge_id = Column(Integer)
    ctfd_challenge_name = Column(String, nullable=True)
    domjudge_team_id = Column(Integer)
    domjudge_team_name = Column(String, nullable=True)
    domjudge_contest_id = Column(String)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String)
    error_message = Column(String, nullable=True)
