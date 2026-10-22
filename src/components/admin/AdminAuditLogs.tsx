import React, { useState, useMemo } from 'react';
import { AdminAuditLogItem } from '../../types/index.js';
import { History, Shield, Search, Terminal } from 'lucide-react';

interface AdminAuditLogsProps {
  logs: AdminAuditLogItem[];
}

export const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const q = searchTerm.toLowerCase().trim();
    return logs.filter((log) => 
      log.action.toLowerCase().includes(q) ||
      (log.target && log.target.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q)) ||
      log.adminUid.toLowerCase().includes(q)
    );
  }, [logs, searchTerm]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'APPROVE_DISH':
        return <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold text-[10px]">DUYỆT MÓN</span>;
      case 'REJECT_DISH':
      case 'DELETE_DISH':
        return <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold text-[10px]">XÓA MÓN</span>;
      case 'UPDATE_DISH':
        return <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold text-[10px]">CẬP NHẬT</span>;
      case 'DELETE_REVIEW':
        return <span className="bg-purple-500/15 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold text-[10px]">XÓA REVIEW</span>;
      case 'RESOLVE_REPORT':
        return <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold text-[10px]">XỬ LÝ REPORT</span>;
      case 'RESTORE_DEFAULT_MENU':
        return <span className="bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full font-extrabold text-[10px]">KHÔI PHỤC MENU</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold text-[10px]">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo hành động, tên món, hoặc nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 placeholder:text-slate-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono self-end sm:self-center flex items-center gap-1.5">
          <span>Nhật ký ghi nhận: <strong className="text-white">{filteredLogs.length}</strong> thao tác</span>
          <span className="text-[10px] bg-slate-800 text-indigo-300 border border-slate-700 px-2 py-0.5 rounded-full font-sans">Lưu 3 ngày gần nhất ⏱️</span>
        </div>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white">Chưa có nhật ký nào!</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Mọi thao tác can thiệp như duyệt món, sửa món, xóa review hay khôi phục dữ liệu sẽ được ghi tự động tại đây.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="divide-y divide-slate-800/80">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getActionBadge(log.action)}
                    <span className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md">
                      {log.target || 'Hệ thống'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono ml-auto sm:ml-0">
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  {log.details && (
                    <div className="text-xs text-slate-300 bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-[11px] break-all">
                      {log.details}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    <span>Admin UID: {log.adminUid ? `${log.adminUid.slice(0, 12)}...` : 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
