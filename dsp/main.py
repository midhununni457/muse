from fastapi import FastAPI
from routes import extract_router, match_router

app = FastAPI(title="DSP Service")

@app.get("/")
def read_root():
    return {"Hello": "World"}

app.include_router(extract_router)
app.include_router(match_router)