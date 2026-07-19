import axiosIntance from "@/api/axiosInterceptorInstance";

interface LoginData {
  username: string;
  password: string;
  tenant_id?: string;
}

interface UserResponse {
  username: string;
  email: string;
  role: "ADMIN" | "CHIEF_PRINCIPAL" | "PRINCIPAL" | "TEACHER" | "STAFF" | "ACCOUNTANT" | "FEE_MANAGER" | "STUDENT";
  id: number;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserResponse;
}

export async function LoginAPI(loginData: LoginData) {
  try {
    // Phase 3: attach this deployment's tenant_id automatically. Callers
    // can still pass an explicit tenant_id (e.g. platform-admin tooling
    // testing multiple schools); NEXT_PUBLIC_TENANT_ID only fills in when
    // one wasn't already provided.
    const payload: LoginData = {
      ...loginData,
      tenant_id: loginData.tenant_id ?? process.env.NEXT_PUBLIC_TENANT_ID,
    };

    const response = await axiosIntance.post<LoginResponse>(
      "/login",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error during login API call:", error);
    throw error;
  }
}
