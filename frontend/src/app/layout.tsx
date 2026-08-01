import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import React from 'react';
import { ThemeProvider } from "./ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { RoleProvider } from "@/context/RoleContext";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { PaletteInitializer } from "@/components/providers/PaletteInitializer";
import { BrandingProvider } from "@/context/BrandingContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Madrasah Management System",
  description: "Madrasah Management System",
  icons: {
    icon: "/logo.png", 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased`}>
        <QueryProvider>
          <BrandingProvider>
            <RoleProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem
                disableTransitionOnChange
              >
                <PaletteInitializer />
                <Toaster richColors position="top-right" />
                <main>{children}</main>
              </ThemeProvider>
            </RoleProvider>
          </BrandingProvider>
        </QueryProvider>
      </body>
    </html>
  );
}