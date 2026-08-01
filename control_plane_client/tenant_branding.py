from fastapi import APIRouter, HTTPException
from control_plane_client.tenant_lookup import get_tenant_branding

tenant_branding_router = APIRouter(prefix="/tenant", tags=["tenant"])

@tenant_branding_router.get("/branding")
def branding(tenant_id: str):
    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id is required")
    return get_tenant_branding(tenant_id)