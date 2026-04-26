'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Plus, Bus, MapPin, Users, Route } from 'lucide-react';

interface Route {
  id: string;
  name: string;
  driver?: { name: string; phone?: string };
  stops: string[];
  departureTime: string;
  arrivalTime?: string;
  capacity: number;
  students?: { id: string; name: string }[];
  _count?: { students: number };
  status: 'ACTIVE' | 'INACTIVE' | 'EN_ROUTE';
}

const STATUS_MAP = {
  ACTIVE: { label: 'Active', cls: 'badge-green' },
  INACTIVE: { label: 'Inactive', cls: 'badge-gray' },
  EN_ROUTE: { label: 'En Route', cls: 'badge-blue' },
};

function RouteCard({ route }: { route: Route }) {
  const [open, setOpen] = useState(false);
  const s = STATUS_MAP[route.status] ?? STATUS_MAP.ACTIVE;
  const occupancy = Math.round(((route._count?.students ?? 0) / route.capacity) * 100);

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Bus className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{route.name}</h3>
            {route.driver && <p className="text-xs text-gray-500">{route.driver.name}{route.driver.phone ? ` · ${route.driver.phone}` : ''}</p>}
          </div>
        </div>
        <span className={`badge ${s.cls}`}>{s.label}</span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <span className="flex items-center gap-1"><Route className="w-3.5 h-3.5 text-gray-400" />{route.stops.length} stops</span>
        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-gray-400" />{route._count?.students ?? 0}/{route.capacity}</span>
        <span className="text-xs text-gray-400 ml-auto">{route.departureTime}</span>
      </div>

      {/* Occupancy bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Occupancy</span>
          <span>{occupancy}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${occupancy > 90 ? 'bg-red-500' : occupancy > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${occupancy}%` }}
          />
        </div>
      </div>

      <button onClick={() => setOpen(o => !o)} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
        {open ? 'Hide stops' : 'View stops'}
      </button>

      {open && route.stops.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="relative pl-5">
            <div className="absolute left-1.5 top-1 bottom-1 w-px bg-gray-200" />
            {route.stops.map((stop, i) => (
              <div key={i} className="relative flex items-center gap-2 mb-2 last:mb-0">
                <div className={`absolute -left-3.5 w-3 h-3 rounded-full border-2 border-white ${i === 0 ? 'bg-green-500' : i === route.stops.length - 1 ? 'bg-red-500' : 'bg-gray-300'}`} />
                <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-600">{stop}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TransportPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [stopsInput, setStopsInput] = useState('');
  const [form, setForm] = useState({ name: '', departureTime: '', capacity: 40 });

  const { data, isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: () => api.get('/transport').then(r => r.data.data),
  });

  const create = useMutation({
    mutationFn: (body: any) => api.post('/transport', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); setShowAdd(false); },
  });

  const routes: Route[] = data || [];
  const totalStudents = routes.reduce((s, r) => s + (r._count?.students ?? 0), 0);
  const enRoute = routes.filter(r => r.status === 'EN_ROUTE').length;

  return (
    <DashboardLayout
      title="Transport"
      subtitle={`${routes.length} routes · ${totalStudents} students`}
      allowedRoles={['ADMIN']}
      actions={
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add Route
        </button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Routes', value: routes.length, icon: Bus, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Students on Bus', value: totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Currently En Route', value: enRoute, icon: Route, color: 'text-green-600', bg: 'bg-green-50' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className={`stat-icon ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
          </div>
        ) : routes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Bus className="w-6 h-6 text-gray-400" /></div>
            <p className="empty-state-title">No routes configured</p>
            <p className="empty-state-desc">Add your first bus route to manage student transport.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {routes.map(route => <RouteCard key={route.id} route={route} />)}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-scale-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Route</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Route Name</label>
                <input className="input" placeholder="e.g. North Campus Route" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Departure Time</label>
                  <input className="input" type="time" value={form.departureTime} onChange={e => setForm(f => ({ ...f, departureTime: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Capacity</label>
                  <input className="input" type="number" min="1" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: +e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Stops (comma-separated)</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Main Gate, Oak St, Park Ave, School"
                  value={stopsInput}
                  onChange={e => setStopsInput(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setShowAdd(false)}>Cancel</button>
              <button
                className="btn-primary flex-1"
                disabled={!form.name || !form.departureTime || create.isPending}
                onClick={() => create.mutate({ ...form, stops: stopsInput.split(',').map(s => s.trim()).filter(Boolean) })}
              >
                {create.isPending ? 'Adding…' : 'Add Route'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
