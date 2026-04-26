'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { feesAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle2, Clock, Plus, ArrowRight, Download } from 'lucide-react';

type Payment = {
  id: string; amount: number; status: 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL';
  student?: { user?: { name?: string }; admissionNo?: string };
  fee?: { name?: string; dueDate?: string };
  method?: string; createdAt?: string;
};

const LANES = [
  { key: 'OVERDUE',  label: 'Overdue',  icon: AlertTriangle,  bg: 'bg-red-50',    border: 'border-red-200',  badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500'    },
  { key: 'PENDING',  label: 'Pending',  icon: Clock,          bg: 'bg-amber-50',  border: 'border-amber-200',badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500'  },
  { key: 'PARTIAL',  label: 'Partial',  icon: TrendingUp,     bg: 'bg-blue-50',   border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500'   },
  { key: 'PAID',     label: 'Paid',     icon: CheckCircle2,   bg: 'bg-green-50',  border: 'border-green-200',badge: 'bg-green-100 text-green-700', dot: 'bg-green-500'  },
] as const;

function PaymentCard({ payment, lane }: { payment: Payment; lane: typeof LANES[number] }) {
  return (
    <div className={`bg-white rounded-xl border ${lane.border} p-3.5 shadow-sm hover:shadow-md transition-all cursor-default group`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
            {payment.student?.user?.name?.[0] || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{payment.student?.user?.name || '—'}</p>
            <p className="text-[11px] text-gray-400 truncate">{payment.student?.admissionNo}</p>
          </div>
        </div>
        <span className="text-sm font-bold text-gray-900 flex-shrink-0">{formatCurrency(payment.amount)}</span>
      </div>
      <p className="text-xs text-gray-500 truncate mb-2">{payment.fee?.name}</p>
      <div className="flex items-center justify-between">
        {payment.fee?.dueDate && (
          <span className="text-[11px] text-gray-400">Due {formatDate(payment.fee.dueDate)}</span>
        )}
        {payment.method && (
          <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{payment.method}</span>
        )}
      </div>
    </div>
  );
}

export default function FeesPage() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'list'>('kanban');

  const { data: fees } = useQuery({
    queryKey: ['fees'],
    queryFn: () => feesAPI.list().then(r => r.data.data),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['fee-payments'],
    queryFn: () => feesAPI.payments().then(r => r.data.data),
  });

  const allPayments: Payment[] = payments as Payment[];

  // Auto-classify payments that are past due as OVERDUE
  const enriched = allPayments.map(p => {
    if (p.status === 'PENDING' && p.fee?.dueDate && new Date(p.fee.dueDate) < new Date()) {
      return { ...p, status: 'OVERDUE' as const };
    }
    return p;
  });

  const byLane = LANES.reduce((acc, lane) => {
    acc[lane.key] = enriched.filter(p => p.status === lane.key);
    return acc;
  }, {} as Record<string, Payment[]>);

  const totalCollected = enriched.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const totalPending   = enriched.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0);
  const totalOverdue   = enriched.filter(p => p.status === 'OVERDUE').reduce((s, p) => s + p.amount, 0);
  const collectionRate = enriched.length
    ? Math.round((enriched.filter(p => p.status === 'PAID').length / enriched.length) * 100) : 0;

  return (
    <DashboardLayout title="Fee Management" allowedRoles={['ADMIN', 'STUDENT']}>
      <div className="space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Collected',  value: formatCurrency(totalCollected), icon: CheckCircle2, iconCls: 'text-green-600', bg: 'bg-green-50', sub: `${collectionRate}% collection rate` },
            { label: 'Pending',    value: formatCurrency(totalPending),   icon: Clock,        iconCls: 'text-amber-600', bg: 'bg-amber-50', sub: `${byLane.PENDING?.length || 0} payments` },
            { label: 'Overdue',    value: formatCurrency(totalOverdue),   icon: AlertTriangle,iconCls: 'text-red-600',   bg: 'bg-red-50',   sub: `${byLane.OVERDUE?.length || 0} payments` },
            { label: 'Transactions', value: enriched.length.toString(),  icon: DollarSign,   iconCls: 'text-indigo-600',bg: 'bg-indigo-50',sub: 'all time' },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${card.iconCls}`} />
                  </div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{card.value}</p>
                <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Tab switch */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {(['kanban', 'list'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab === 'kanban' ? 'Kanban' : 'List'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" /> Export
            </button>
            <button className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> New Fee
            </button>
          </div>
        </div>

        {/* Kanban board */}
        {activeTab === 'kanban' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {LANES.map(lane => {
              const Icon = lane.icon;
              const lanePayments = byLane[lane.key] || [];
              const laneTotal = lanePayments.reduce((s, p) => s + p.amount, 0);
              return (
                <div key={lane.key} className={`${lane.bg} rounded-2xl border ${lane.border} p-4`}>
                  {/* Lane header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${lane.badge.includes('red') ? 'text-red-600' : lane.badge.includes('amber') ? 'text-amber-600' : lane.badge.includes('blue') ? 'text-blue-600' : 'text-green-600'}`} />
                      <span className="text-sm font-semibold text-gray-800">{lane.label}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${lane.badge}`}>{lanePayments.length}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{formatCurrency(laneTotal)}</p>

                  {/* Cards */}
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
                    {lanePayments.length ? lanePayments.map(p => (
                      <PaymentCard key={p.id} payment={p} lane={lane} />
                    )) : (
                      <div className="text-center py-8 text-gray-300 text-sm">No payments</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List view */
          <div className="card !p-0 overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th><th>Fee</th><th>Amount</th>
                  <th>Method</th><th>Status</th><th>Due / Paid</th>
                </tr>
              </thead>
              <tbody>
                {enriched.slice(0, 50).map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {p.student?.user?.name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.student?.user?.name || '—'}</p>
                          <p className="text-xs text-gray-400">{p.student?.admissionNo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-gray-600">{p.fee?.name}</td>
                    <td className="font-semibold text-sm">{formatCurrency(p.amount)}</td>
                    <td>{p.method && <span className="badge badge-gray text-xs">{p.method}</span>}</td>
                    <td>
                      <span className={`badge text-xs ${p.status === 'PAID' ? 'badge-green' : p.status === 'OVERDUE' ? 'badge-red' : p.status === 'PARTIAL' ? 'badge-blue' : 'badge-yellow'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">{p.fee?.dueDate ? formatDate(p.fee.dueDate) : formatDate(p.createdAt!)}</td>
                  </tr>
                ))}
                {!enriched.length && (
                  <tr><td colSpan={6} className="text-center text-gray-400 py-12">No payments</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Fee Structures */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Fee Structures</h3>
            <a href="#" className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
              Manage <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {(fees || []).map((fee: any) => (
              <div key={fee.id} className="flex items-center gap-3 p-3 rounded-xl border hover:border-primary-200 hover:bg-primary-50/30 transition-all cursor-default">
                <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{fee.name}</p>
                  <p className="text-xs text-gray-400">{fee.academicYear}{fee.dueDate ? ` · Due ${formatDate(fee.dueDate)}` : ''}</p>
                </div>
                <p className="text-sm font-bold text-green-700 flex-shrink-0">{formatCurrency(fee.amount)}</p>
              </div>
            ))}
            {!(fees || []).length && <p className="text-sm text-gray-400 col-span-3 py-4 text-center">No fee structures defined</p>}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
