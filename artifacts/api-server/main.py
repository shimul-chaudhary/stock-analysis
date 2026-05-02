import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import health, stocks, macro, holdings, analysis

app = FastAPI(title="Deep Analysis API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(stocks.router, prefix="/api")
app.include_router(macro.router, prefix="/api")
app.include_router(holdings.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
