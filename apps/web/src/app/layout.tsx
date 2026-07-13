import "./globals.css";
import React from "react";
import QueryProvider from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";

import { Inter, Outfit } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata = {
  title: "RepairFlow - Electronics Repair Shop Management",
  description:
    "Track every device, repair and customer from intake to delivery.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`antialiased min-h-screen text-slate-900 bg-slate-50 ${inter.className} ${inter.variable} ${outfit.variable}`}
      >
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
