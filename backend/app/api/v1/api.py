from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    applications,
    compliance,
    evc,
    documents,
    audit,
    rules,
    alerts,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(applications.router, prefix="/applications", tags=["Applications"])
api_router.include_router(compliance.router, prefix="/compliance", tags=["Compliance"])
api_router.include_router(evc.router, prefix="/evc", tags=["EVC Desk"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Trail"])
api_router.include_router(rules.router, prefix="/rules", tags=["Rules Engine"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
