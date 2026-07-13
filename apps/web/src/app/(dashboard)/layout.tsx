'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Cpu,
  LayoutDashboard,
  Users,
  Smartphone,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  History,
  Building,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Loader2,
  Bell,
  User,
  Check,
  Trash2,
  Settings,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';
import { useRef } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, activeBranchId, setActiveBranchId, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notificationsRes } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res: any = await apiClient.get('/notifications');
      return res.data || [];
    },
    enabled: !!user,
  });

  const notifications = notificationsRes || [];
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    console.log('DashboardLayout: useEffect check - loading =', loading, 'user =', user);
    if (!loading && !user) {
      console.log('DashboardLayout: No session found. Redirecting to /login...');
      router.push('/login');
    }
  }, [user, loading, router]);

  console.log('DashboardLayout: Render state - loading =', loading, 'user =', user);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <span className="text-sm text-slate-500 font-medium font-outfit">Loading RepairFlow session...</span>
      </div>
    );
  }

  // Navigation config based on role permissions
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['SYSTEM_ADMIN', 'OWNER', 'BRANCH_MANAGER', 'FRONT_DESK', 'TECHNICIAN'] },
    { name: 'Repair Tickets', path: '/tickets', icon: ClipboardList, roles: ['SYSTEM_ADMIN', 'OWNER', 'BRANCH_MANAGER', 'FRONT_DESK', 'TECHNICIAN'] },
    { name: 'Customers', path: '/customers', icon: Users, roles: ['SYSTEM_ADMIN', 'OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'] },
    { name: 'Devices', path: '/devices', icon: Smartphone, roles: ['SYSTEM_ADMIN', 'OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'] },
    { name: 'Estimates', path: '/estimates', icon: FileSpreadsheet, roles: ['SYSTEM_ADMIN', 'OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'] },
    { name: 'Invoices', path: '/invoices', icon: FileText, roles: ['SYSTEM_ADMIN', 'OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'] },
    { name: 'Reports', path: '/reports', icon: TrendingUp, roles: ['SYSTEM_ADMIN', 'OWNER', 'BRANCH_MANAGER'] },
    { name: 'Branches', path: '/branches', icon: Building, roles: ['SYSTEM_ADMIN', 'OWNER'] },
    { name: 'Staff Management', path: '/users', icon: User, roles: ['SYSTEM_ADMIN', 'OWNER', 'BRANCH_MANAGER'] },
    { name: 'Audit Logs', path: '/audit-logs', icon: History, roles: ['SYSTEM_ADMIN', 'OWNER'] },
    { name: 'System Settings', path: '/settings', icon: Settings, roles: ['SYSTEM_ADMIN', 'OWNER'] },
  ];

  const visibleMenuItems = menuItems.filter((item) => item.roles.includes(user.role));

  const toggleSidebar = () => setSidebarExpanded(!sidebarExpanded);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 fixed top-0 left-0 right-0 h-16 px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 text-white p-1.5 rounded-lg">
            <Cpu className="w-5 h-5 text-blue-400" />
          </div>
          <span className="font-bold text-lg font-outfit">RepairFlow</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar - Desktop */}
      <aside
        className={`hidden md:flex flex-col justify-between border-r border-slate-200 bg-white sticky top-0 h-screen transition-all duration-300 z-30 ${
          sidebarExpanded ? 'w-64' : 'w-20'
        }`}
      >
        <div>
          {/* Logo Brand Panel */}
          <div className="p-6 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="bg-slate-900 text-white p-2 rounded-xl shrink-0 shadow-sm">
                <Cpu className="w-6 h-6 text-blue-400" />
              </div>
              {sidebarExpanded && (
                <div className="transition-all duration-200">
                  <span className="font-bold text-lg tracking-tight text-slate-900 font-outfit block">RepairFlow</span>
                  <span className="text-[9px] block text-slate-400 font-mono tracking-widest uppercase">Console</span>
                </div>
              )}
            </div>
            {sidebarExpanded && (
              <button
                onClick={toggleSidebar}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 hidden lg:block"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover-slide ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title={item.name}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  {sidebarExpanded && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-100">
          {sidebarExpanded && (
            <div className="bg-slate-50 p-3 rounded-xl mb-3 flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold font-outfit text-sm shrink-0">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <span className="font-semibold text-xs text-slate-900 block truncate">{user.fullName}</span>
                <span className="text-[9px] block text-slate-400 uppercase font-mono tracking-wider font-bold">
                  {user.role}
                </span>
              </div>
            </div>
          )}
          
          <button
            onClick={logout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all duration-200 hover-slide"
          >
            <LogOut className="w-5 h-5 text-red-500 shrink-0" />
            {sidebarExpanded && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Overlay */}
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          
          {/* Sidebar */}
          <div className="relative w-64 max-w-xs bg-white h-full flex flex-col justify-between p-6 z-50 animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="bg-slate-900 text-white p-1.5 rounded-lg">
                    <Cpu className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="font-bold text-lg font-outfit">RepairFlow</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {visibleMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm shrink-0">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="font-semibold text-xs text-slate-900 block">{user.fullName}</span>
                  <span className="text-[9px] block text-slate-400 uppercase font-mono tracking-wider font-bold">
                    {user.role}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all duration-200"
              >
                <LogOut className="w-5 h-5 text-red-500 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-0 pt-16 md:pt-0">
        {/* Top Navbar */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 sticky top-0 z-20">
          <div>
            {!sidebarExpanded && (
              <button
                onClick={toggleSidebar}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 block mr-4"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            {user.branches && user.branches.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">Branch:</span>
                <select
                  value={activeBranchId || ''}
                  onChange={(e) => setActiveBranchId(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-slate-400 focus:bg-white transition-all cursor-pointer"
                >
                  {user.branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {user.branches && user.branches.length === 1 && (
              <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
                {user.branches[0].name}
              </div>
            )}
            {/* Notifications Popover */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl relative transition-all"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-blue-600 border-2 border-white rounded-full" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl border border-slate-200 shadow-premium z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
                  {/* Popover Header */}
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 font-outfit">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllReadMutation.mutate()}
                        className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wider"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Popover Body */}
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        All caught up! No notifications.
                      </div>
                    ) : (
                      notifications.map((n: any) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.isRead) markReadMutation.mutate(n.id);
                            if (n.link) {
                              router.push(n.link);
                              setShowNotifications(false);
                            }
                          }}
                          className={`p-4 text-left transition-colors cursor-pointer hover:bg-slate-50 flex items-start justify-between gap-3 ${
                            !n.isRead ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-semibold text-slate-900 ${!n.isRead ? 'font-bold' : ''}`}>
                              {n.title}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                              {n.message}
                            </p>
                            <span className="text-[9px] text-slate-400 block mt-2 font-mono">
                              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            </span>
                          </div>

                          <div className="flex gap-1 items-center shrink-0">
                            {!n.isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markReadMutation.mutate(n.id);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded"
                                title="Mark read"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotificationMutation.mutate(n.id);
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded"
                              title="Delete notification"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">{user.fullName}</span>
              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {user.role}
              </span>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
