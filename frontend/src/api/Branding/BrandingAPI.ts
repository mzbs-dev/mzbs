import axiosInstance from "@/api/axiosInterceptorInstance";

export type TenantBranding = {
  school_name: string;
  logo_url: string | null;
  status: string;
};

export async function getTenantBranding(): Promise<TenantBranding> {
  const res = await axiosInstance.get("/tenant/branding", {
    params: { tenant_id: process.env.NEXT_PUBLIC_TENANT_ID },
  });
  return res.data;
}