from fastapi import FastAPI

app = FastAPI(
    title="MedInsight API",
    description="Backend API for the MedInsight health intelligence platform.",
    version="0.1.0",
)


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