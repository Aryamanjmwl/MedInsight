from contextlib import asynccontextmanager

from fastapi import FastAPI

from .api.routes.account import router as account_router
from .api.routes.biomarkers import router as biomarkers_router
from .api.routes.dashboard import router as dashboard_router
from .api.routes.reports import router as reports_router
from .cors import configure_cors
from .db import initialize_database
from .security import configure_security_headers


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
configure_cors(app)
configure_security_headers(app)

app.include_router(reports_router)
app.include_router(biomarkers_router)
app.include_router(dashboard_router)
app.include_router(account_router)


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
