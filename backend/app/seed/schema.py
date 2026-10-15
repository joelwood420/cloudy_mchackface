from datetime import date
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, model_validator

# Limits mirror the column sizes in app/models.py; a value that passes here always fits the database.
Key = Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=100)]
Code = Annotated[str, StringConstraints(min_length=1, max_length=20)]
ShortTitle = Annotated[str, StringConstraints(min_length=1, max_length=200, strip_whitespace=True)]
Title = Annotated[str, StringConstraints(min_length=1, max_length=300, strip_whitespace=True)]
Note = Annotated[str, StringConstraints(min_length=1, max_length=300, strip_whitespace=True)]
TaskType = Literal["learning_path", "lab", "assessment_step"]


def _fits_url_column(url: HttpUrl) -> HttpUrl:
    if len(str(url)) > 1000:
        raise ValueError("URL is longer than 1000 characters")
    return url


Url = Annotated[HttpUrl, AfterValidator(_fits_url_column)]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class _Linked(_Strict):
    """Something the student goes and does somewhere else, so it needs at least one link."""

    external_url: Url | None = None
    uplearn_url: Url | None = None

    @model_validator(mode="after")
    def needs_a_link(self):
        if self.external_url is None and self.uplearn_url is None:
            raise ValueError("needs external_url or uplearn_url")
        return self


class SeedTask(_Linked):
    key: Key
    title: Title
    type: TaskType
    note: Note | None = None


class SeedWeek(_Strict):
    key: Key
    week_number: int = Field(ge=1)
    title: ShortTitle
    tasks: list[SeedTask] = []


class SeedSubmodule(_Strict):
    key: Key
    code: Code
    title: Title
    uplearn_url: Url | None = None
    prerequisites: list[Key] = []
    weeks: list[SeedWeek] = []

    @model_validator(mode="after")
    def check_lists(self) -> "SeedSubmodule":
        if len(set(self.prerequisites)) != len(self.prerequisites):
            raise ValueError("a prerequisite is listed more than once")
        numbers = [w.week_number for w in self.weeks]
        if numbers and numbers != list(range(numbers[0], numbers[0] + len(numbers))):
            raise ValueError(f"weeks must be consecutive and ascending (got {numbers})")
        return self


class SeedModule(_Strict):
    key: Key
    code: Code
    title: ShortTitle
    order: int
    uplearn_url: Url | None = None


class SeedAssessment(_Strict):
    key: Key
    title: Title
    due_date: date | None = None
    uplearn_url: Url | None = None


class SeedFile(_Strict):
    """One module file: seed/<module>.yaml."""

    module: SeedModule
    submodules: list[SeedSubmodule] = []
    assessments: list[SeedAssessment] = []

    @model_validator(mode="after")
    def unique_week_numbers(self) -> "SeedFile":
        seen: set[int] = set()
        for week in self.all_weeks():
            if week.week_number in seen:
                raise ValueError(f"week_number {week.week_number} is used by more than one week")
            seen.add(week.week_number)
        return self

    def all_weeks(self) -> list[SeedWeek]:
        return [week for sub in self.submodules for week in sub.weeks]

    def keys(self) -> list[str]:
        out = [self.module.key]
        for sub in self.submodules:
            out.append(sub.key)
            for week in sub.weeks:
                out.append(week.key)
                out.extend(task.key for task in week.tasks)
        out.extend(a.key for a in self.assessments)
        return out


class SeedPrerequisite(_Linked):
    key: Key
    title: Title
    note: Note | None = None


class SeedPrerequisiteFile(_Strict):
    """seed/prerequisites.yaml: shared one-off setup steps, referenced by key from submodules."""

    prerequisites: list[SeedPrerequisite] = []

    def keys(self) -> list[str]:
        return [p.key for p in self.prerequisites]
