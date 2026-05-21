from fastapi import APIRouter

from app.api.routes import auth, health, invites, policies, profile, recommendations, trips, webhooks

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(profile.router)
api_router.include_router(policies.router)
api_router.include_router(recommendations.router)
api_router.include_router(trips.router)
api_router.include_router(invites.router)
api_router.include_router(webhooks.router)
