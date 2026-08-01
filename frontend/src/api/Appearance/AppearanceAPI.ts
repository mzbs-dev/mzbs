import axiosInstance from "@/api/axiosInterceptorInstance";

export type AppearanceSettings = {
  theme_palette: string;
  updated_at: string;
};

export async function getAppearance(): Promise<AppearanceSettings> {
  const res = await axiosInstance.get("/appearance");
  return res.data;
}

export async function updateAppearance(themePalette: string): Promise<AppearanceSettings> {
  const res = await axiosInstance.patch("/appearance", { theme_palette: themePalette });
  return res.data;
}
