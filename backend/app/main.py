from fastapi import APIRouter, FastAPI

from app.api import auth, modules

app = FastAPI(title="Yoobee Study Guide")

api = APIRouter(prefix="/api")


@api.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


api.include_router(auth.router)
api.include_router(modules.router)
app.include_router(api)
