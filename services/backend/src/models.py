from database import Base

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    SmallInteger,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(200), nullable=False, unique=True, index=True)
    email = Column(String(200), nullable=False, unique=True, index=True)
    password_hash = Column(String(512), nullable=False)
    first_name = Column(String(200), nullable=False, default="")
    last_name = Column(String(200), nullable=False, default="")
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    projects = relationship("Project", back_populates="owner")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    visibility = Column(SmallInteger, nullable=False, default=1)
    name = Column(String(500), nullable=False, default="Untitled")
    uuid = Column(String(500), nullable=False, unique=True, index=True)
    data = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    owner = relationship("User", back_populates="projects")
