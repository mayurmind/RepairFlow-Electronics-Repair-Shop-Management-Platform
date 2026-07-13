'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import {
  History,
  ShieldAlert,
  Loader2,
  X,
  Search,
  Filter,
  Eye,
  CheckCircle,
} from 'lucide-react';

export default function AuditLogsPage() {
  const { user, activeBranchId } = useAuth();

  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [entityTypeFilter, setEntityTypeFilter] = useState('ALL');
  const [actorFilter, setActorFilter] = useState('');

  // Role Restriction check
  const isAuthorized = ['SYSTEM_ADMIN', 'OWNER'].includes(user.role);

  // Queries
  const { data: auditData, isLoading: loadingAudits } = useQuery<any>({
    queryKey: ['audit-logs', activeBranchId, page, entityTypeFilter, actorFilter],
    queryFn: async () => {
      const params: any = { page, limit: 15 };
      if (activeBranchId) params.branchId = activeBranchId;
      if (entityTypeFilter !== 'ALL') params.entityType = entityTypeFilter;
      if (actorFilter) params.actorUserId = actorFilter;

      const res: any = await apiClient.get('/audit-logs', { params });
      return res.data;
    },
    enabled: isAuthorized && !!activeBranchId,
  });

  const { data: staffData } = useQuery<any>({
    queryKey: ['staff-list-for-audits'],
    queryFn: () => apiClient.get('/users'),
    enabled: isAuthorized,
  });

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl">
        <ShieldAlert className="w-12 h-12 text-slate-400 stroke-1" />
        <h3 className="font-bold text-slate-800 text-lg mt-3">Access Restricted</h3>
        <p className="text-sm text-slate-400 mt-1 max-w-sm text-center">
          System audit logs are restricted to Owners and Administrators to preserve system integrity.
        </p>
      </div>
    );
  }

  const logsList = auditData?.data || [];
  const meta = auditData?.meta;
  const staffList = staffData?.data || [];

  const formatJson = (val: any) => {
    if (!val) return 'None';
    try {
      if (typeof val === 'string') {
        return JSON.stringify(JSON.parse(val), null, 2);
      }
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-outfit text-slate-900">Security Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-1">Immutable system-wide ledger of operations and permission changes.</p>
      </div>

      {/* Filters Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase font-mono">Entity Filter:</span>
            <select
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
            >
              <option value="ALL">All Entities</option>
              <option value="USER">User Accounts</option>
              <option value="BRANCH">Branch Settings</option>
              <option value="REPAIR_TICKET">Repair Tickets</option>
              <option value="DIAGNOSIS">Diagnostics</option>
              <option value="ESTIMATE">Estimates</option>
              <option value="INVOICE">Invoices</option>
              <option value="PAYMENT_RECORD">Payment Records</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase font-mono">Actor Filter:</span>
            <select
              value={actorFilter}
              onChange={(e) => {
                setActorFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
            >
              <option value="">All Actors</option>
              {staffList.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl font-mono uppercase tracking-wide">
          Immutable Append-Only Ledger
        </span>
      </div>

      {/* Audit Log Table */}
      {loadingAudits ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 flex justify-center">
          <Loader2 className="w-8 h-8 text-slate-350 animate-spin" />
        </div>
      ) : logsList.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-250 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Actor</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Entity Type</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logsList.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 font-bold text-slate-800">
                      {log.actorUser ? log.actorUser.fullName : 'System Process'}
                      {log.actorUser && (
                        <span className="block text-[10px] font-normal text-slate-450 uppercase">{log.actorUser.role}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-800">{log.action.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded uppercase font-bold text-[9px] text-slate-500">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-400">{log.ipAddress || 'Internal'}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setIsDetailsOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-500 transition-colors p-1"
                      >
                        <Eye className="w-4 h-4 inline-block" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-[10px] font-bold disabled:opacity-50 transition-all"
              >
                Previous
              </button>
              <span className="text-[10px] text-slate-450 font-bold">
                Page {page} of {meta.totalPages}
              </span>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-[10px] font-bold disabled:opacity-50 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <History className="w-12 h-12 text-slate-350 mx-auto stroke-1" />
          <h3 className="font-bold text-slate-800 text-lg mt-3">No audit records found</h3>
        </div>
      )}

      {/* DETAIL DRAWER / INSPECTOR */}
      {isDetailsOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsDetailsOpen(false)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold font-outfit text-slate-900">Inspect Log Event</h3>
                  <span className="text-xs text-slate-400 block font-mono">ID: {selectedLog.id}</span>
                </div>
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Diff Viewer info */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-650">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">Action</span>
                    <span className="text-slate-800 font-extrabold">{selectedLog.action}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">Timestamp</span>
                    <span>{new Date(selectedLog.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Old Values */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-450 uppercase font-mono tracking-wider mb-2">Old Value State</h4>
                  <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-[10px] font-mono overflow-x-auto max-h-40">
                    {formatJson(selectedLog.oldValues)}
                  </pre>
                </div>

                {/* New Values */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-450 uppercase font-mono tracking-wider mb-2">New Value State</h4>
                  <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-[10px] font-mono overflow-x-auto max-h-40">
                    {formatJson(selectedLog.newValues)}
                  </pre>
                </div>

                {/* Metadata */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-450 uppercase font-mono tracking-wider mb-2">Transaction Metadata</h4>
                  <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs font-semibold text-slate-600">
                    <div>IP Address: <span className="font-mono">{selectedLog.ipAddress || 'Internal'}</span></div>
                    <div>User Agent: <span className="font-normal text-slate-500 truncate block mt-0.5">{selectedLog.userAgent || 'None'}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
