from fastapi import APIRouter, FastAPI

from app.api import assessments, auth, modules, tasks, this_week
from app.config import get_settings
from app.frontend import mount_frontend

app = FastAPI(title="Yoobee Study Guide")

api = APIRouter(prefix="/api")


@api.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


api.include_router(auth.router)
api.include_router(modules.router)
api.include_router(tasks.router)
api.include_router(assessments.router)
api.include_router(this_week.router)
app.include_router(api)

if (dist := get_settings().frontend_dist) is not None:
    mount_frontend(app, dist)
