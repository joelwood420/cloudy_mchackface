from datetime import date

from pydantic import BaseModel, ConfigDict


class _Out(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ModuleSummary(_Out):
    key: str
    code: str
    title: str
    week_count: int
    task_count: int


class TaskOut(_Out):
    key: str
    title: str
    type: str
    external_url: str | None
    uplearn_url: str | None


class WeekOut(_Out):
    key: str
    week_number: int
    title: str
    tasks: list[TaskOut]


class AssessmentOut(_Out):
    key: str
    title: str
    due_date: date | None
    uplearn_url: str | None


class ModuleDetail(_Out):
    key: str
    code: str
    title: str
    weeks: list[WeekOut]
    assessments: list[AssessmentOut]
