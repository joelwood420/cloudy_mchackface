from datetime import date

from pydantic import BaseModel, ConfigDict


class _Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ModuleSummary(_Out):
    key: str
    code: str
    title: str
    submodule_count: int
    week_count: int
    task_count: int
    uplearn_url: str | None


class TaskOut(_Out):
    key: str
    title: str
    type: str
    external_url: str | None
    uplearn_url: str | None
    note: str | None


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
