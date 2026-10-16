from datetime import date
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints


class _Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ModuleSummary(_Out):
    key: str
    code: str
    title: str
    submodule_count: int
    week_count: int
    task_count: int
    completed_count: int
    week_numbers: list[int]
    uplearn_url: str | None


class TaskOut(_Out):
    key: str
    title: str
    type: str
    external_url: str | None
    uplearn_url: str | None
    note: str | None
    done: bool = False


class WeekOut(_Out):
    key: str
    submodule_key: str
    week_number: int
    title: str
    tasks: list[TaskOut]


class AssessmentOut(_Out):
    key: str
    title: str
    due_date: date | None
    uplearn_url: str | None


class PrerequisiteOut(_Out):
    key: str
    title: str
    note: str | None
    external_url: str | None
    uplearn_url: str | None
    completed: bool = False


class SubmoduleOut(BaseModel):
    key: str
    code: str
    title: str
    uplearn_url: str | None
    first_week: int | None
    last_week: int | None
    prerequisites: list[PrerequisiteOut]


class ModuleDetail(_Out):
    key: str
    code: str
    title: str
    uplearn_url: str | None
    submodules: list[SubmoduleOut]
    weeks: list[WeekOut]
    assessments: list[AssessmentOut]


Email = Annotated[
    str,
    StringConstraints(strip_whitespace=True, to_lower=True, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"),
]


class SignupIn(BaseModel):
    email: Email
    password: Annotated[str, StringConstraints(min_length=10, max_length=256)]
    accepted_disclaimer_version: int


class LoginIn(BaseModel):
    email: Email
    password: Annotated[str, StringConstraints(min_length=1, max_length=256)]


class IntakeOut(_Out):
    key: str
    title: str


class MeOut(BaseModel):
    email: str
    study_mode: str
    intake: IntakeOut
