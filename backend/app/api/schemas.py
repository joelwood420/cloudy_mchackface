from datetime import date
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

from app.auth.passwords import MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH


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
    assessment_key: str | None = None
    assessment_task: int | None = None


class WeekOut(_Out):
    key: str
    submodule_key: str
    week_number: int
    title: str
    tasks: list[TaskOut]
    schedule_post_url: str | None = None


class ResourceOut(_Out):
    key: str
    title: str
    url: str
    group: str
    tasks: list[int]


class ResourceBoxOut(BaseModel):
    """One assessment's resources for the tasks in a This week slot."""

    assessment_key: str
    assessment_short: str
    task_numbers: list[int]
    resources: list[ResourceOut]


class AssessmentOut(_Out):
    key: str
    title: str
    due_date: date | None
    uplearn_url: str | None
    submitted: bool = False
    status: str = "no_date"
    days_until: int | None = None
    resources: list[ResourceOut] = []


class AssessmentStatusOut(AssessmentOut):
    module_key: str
    module_code: str


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
    password: Annotated[str, StringConstraints(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)]
    accepted_disclaimer_version: int
    intake_key: Annotated[str, StringConstraints(min_length=1, max_length=100)]


class LoginIn(BaseModel):
    email: Email
    password: Annotated[str, StringConstraints(min_length=1, max_length=256)]


class ForgotPasswordIn(BaseModel):
    email: Email


class ResetPasswordIn(BaseModel):
    token: Annotated[str, StringConstraints(min_length=1, max_length=200)]
    password: Annotated[str, StringConstraints(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)]


class IntakeOut(_Out):
    key: str
    title: str
    study_mode: str


class SettingsIn(BaseModel):
    intake_key: Annotated[str, StringConstraints(min_length=1, max_length=100)]


class MeOut(BaseModel):
    email: str
    study_mode: str
    intake: IntakeOut
    intake_confirmed: bool


class SignupOut(MeOut):
    prefilled_through_week: int | None = None


class WeekSpanOut(BaseModel):
    week_number: int
    starts_on: date
    ends_on: date


class NextWeekOut(BaseModel):
    week_number: int
    starts_on: date


class CurrentBreakOut(BaseModel):
    starts_on: date
    ends_on: date
    week_of_break: int
    length_weeks: int


class UpcomingBreakOut(BaseModel):
    starts_on: date
    ends_on: date
    length_weeks: int
    resumes_week: int
    resumes_on: date


class HolidayOut(_Out):
    day: date
    name: str


class SubmoduleRef(_Out):
    key: str
    code: str
    title: str
    uplearn_url: str | None


class ThisWeekGroup(BaseModel):
    module_key: str
    module_code: str
    module_title: str
    module_uplearn_url: str | None
    submodule: SubmoduleRef
    week: WeekOut
    prerequisites: list[PrerequisiteOut]
    assessment_resources: list[ResourceBoxOut] = []


class AheadOut(BaseModel):
    week_number: int
    groups: list[ThisWeekGroup]


class LurkingTaskOut(TaskOut):
    module_code: str
    submodule_code: str
    submodule_uplearn_url: str | None
    schedule_post_url: str | None = None


class LurkingWeekOut(BaseModel):
    week_number: int
    tasks: list[LurkingTaskOut]


class StatsOut(BaseModel):
    done: int
    total: int
    next_deadline_days: int | None


class ThisWeekOut(BaseModel):
    today: date
    status: str
    week: WeekSpanOut | None
    current_break: CurrentBreakOut | None
    next_week: NextWeekOut | None
    upcoming_break: UpcomingBreakOut | None
    holidays: list[HolidayOut]
    groups: list[ThisWeekGroup]
    ahead: AheadOut | None
    lurking: list[LurkingWeekOut]
    assessments: list[AssessmentStatusOut]
    stats: StatsOut
