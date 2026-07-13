import './globals.css';
import React from 'react';
import QueryProvider from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';

export const metadata = {
  title: 'RepairFlow - Electronics Repair Shop Management',
  description: 'Track every device, repair and customer from intake to delivery.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen text-slate-900 bg-slate-50" style={{ fontFamily: 'Inter, sans-serif' }}>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
