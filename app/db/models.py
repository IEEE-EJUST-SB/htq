from sqlalchemy import Column, Integer, String
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
    domjudge_contest_id = Column(Integer)
    domjudge_problem_id = Column(String) # DOMjudge problem IDs can be strings (e.g. 'A', 'B')
