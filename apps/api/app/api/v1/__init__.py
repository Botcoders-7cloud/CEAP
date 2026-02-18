"""CEAP API v1 Package"""
from fastapi import APIRouter
from app.api.v1 import auth, events, submissions, admin

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(events.router)
router.include_router(submissions.router)
router.include_router(admin.router)
