from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, model_validator

Key = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=100)]
Title = Annotated[str, StringConstraints(min_length=1, max_length=300, strip_whitespace=True)]
TaskType = Literal["learning_path", "lab", "assessment_step"]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SeedTask(_Strict):
    key: Key
    title: Title
    type: TaskType
    external_url: HttpUrl | None = None
    uplearn_url: HttpUrl | None = None

    @model_validator(mode="after")
    def needs_a_link(self) -> "SeedTask":
        if self.external_url is None and self.uplearn_url is None:
            raise ValueError("task needs external_url or uplearn_url")
        return self


class SeedWeek(_Strict):
    key: Key
    week_number: int = Field(ge=1)
    title: Title
    tasks: list[SeedTask] = []


class SeedModule(_Strict):
    key: Key
    code: Annotated[str, StringConstraints(min_length=1, max_length=20)]
    title: Title
    order: int
    uplearn_url: HttpUrl | None = None


class SeedAssessment(_Strict):
    key: Key
    title: Title
    due_date: date | None = None
    uplearn_url: HttpUrl | None = None


class SeedFile(_Strict):
    module: SeedModule
    weeks: list[SeedWeek] = []
    assessments: list[SeedAssessment] = []

    def keys(self) -> list[str]:
        out = [self.module.key]
        for week in self.weeks:
            out.append(week.key)
            out.extend(task.key for task in week.tasks)
        out.extend(a.key for a in self.assessments)
        return out
