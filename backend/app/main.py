from contextlib import asynccontextmanager

from fastapi import FastAPI

from .api.routes.reports import router as reports_router
from .db import initialize_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield

app = FastAPI(
    title="MedInsight API",
    description="Backend API for the MedInsight health intelligence platform.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(reports_router)


@app.get("/")
def read_root():
    return {
        "name": "MedInsight API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }
