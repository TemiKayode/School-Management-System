'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Plus, Search, BookOpen, BookMarked, Clock, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  category?: string;
  totalCopies: number;
  availableCopies: number;
  coverUrl?: string;
  borrowedBy?: { id: string; name: string }[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Science: 'badge-blue',
  Math: 'badge-violet',
  History: 'badge-orange',
  Literature: 'badge-green',
  Physics: 'badge-indigo',
  Chemistry: 'badge-yellow',
  Biology: 'badge-green',
  Default: 'badge-gray',
};

function BookCard({ book, onBorrow, onReturn, canManage }: {
  book: Book;
  onBorrow: (id: string) => void;
  onReturn: (id: string) => void;
  canManage: boolean;
}) {
  const available = book.availableCopies > 0;
  const catColor = CATEGORY_COLORS[book.category || ''] ?? CATEGORY_COLORS.Default;

  return (
    <div className="card-hover flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">{book.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{book.author}</p>
          {book.category && <span className={`badge ${catColor} mt-1.5`}>{book.category}</span>}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs border-t border-gray-50 pt-3">
        <span className={`flex items-center gap-1 font-medium ${available ? 'text-green-600' : 'text-red-500'}`}>
          {available ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {available ? `${book.availableCopies} available` : 'All borrowed'}
        </span>
        <span className="text-gray-400">{book.totalCopies} total</span>
      </div>

      {canManage && (
        <div className="flex gap-2">
          <button
            className="btn-secondary flex-1 text-xs py-1.5"
            disabled={!available}
            onClick={() => onBorrow(book.id)}
          >
            Borrow
          </button>
          <button
            className="btn-ghost flex-1 text-xs py-1.5"
            onClick={() => onReturn(book.id)}
          >
            Return
          </button>
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  const { user } = useAuthStore();
  const role = user?.role || '';
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', author: '', isbn: '', category: '', totalCopies: 1 });

  const { data, isLoading } = useQuery({
    queryKey: ['books'],
    queryFn: () => api.get('/library').then(r => r.data.data),
  });

  const borrow = useMutation({
    mutationFn: (bookId: string) => api.post(`/library/${bookId}/borrow`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books'] }),
  });

  const returnBook = useMutation({
    mutationFn: (bookId: string) => api.post(`/library/${bookId}/return`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books'] }),
  });

  const create = useMutation({
    mutationFn: (body: typeof form) => api.post('/library', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['books'] }); setShowAdd(false); },
  });

  const books: Book[] = (data || []).filter((b: Book) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    const matchesCat = !category || b.category === category;
    return matchesSearch && matchesCat;
  });

  const categories = [...new Set((data || []).map((b: Book) => b.category).filter(Boolean))];
  const totalAvailable = (data || []).reduce((s: number, b: Book) => s + b.availableCopies, 0);
  const totalBorrowed = (data || []).reduce((s: number, b: Book) => s + (b.totalCopies - b.availableCopies), 0);

  return (
    <DashboardLayout
      title="Library"
      subtitle={`${(data || []).length} books · ${totalAvailable} available`}
      allowedRoles={['ADMIN', 'STUDENT']}
      actions={
        role === 'ADMIN' ? (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add Book
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Books', value: (data || []).length, icon: BookOpen, color: 'text-primary-600', bg: 'bg-primary-50' },
            { label: 'Available', value: totalAvailable, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Borrowed', value: totalBorrowed, icon: BookMarked, color: 'text-orange-600', bg: 'bg-orange-50' },
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

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search by title or author…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select w-auto" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
          </div>
        ) : books.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><BookOpen className="w-6 h-6 text-gray-400" /></div>
            <p className="empty-state-title">No books found</p>
            <p className="empty-state-desc">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {books.map(book => (
              <BookCard
                key={book.id}
                book={book}
                onBorrow={borrow.mutate}
                onReturn={returnBook.mutate}
                canManage={role === 'STUDENT' || role === 'ADMIN'}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-scale-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Book</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input className="input" placeholder="Book title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="label">Author</label>
                <input className="input" placeholder="Author name" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">ISBN</label>
                  <input className="input" placeholder="978-…" value={form.isbn} onChange={e => setForm(f => ({ ...f, isbn: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Category</label>
                  <input className="input" placeholder="Science" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Number of Copies</label>
                <input className="input" type="number" min="1" value={form.totalCopies} onChange={e => setForm(f => ({ ...f, totalCopies: +e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button className="btn-secondary flex-1" onClick={() => setShowAdd(false)}>Cancel</button>
              <button
                className="btn-primary flex-1"
                disabled={!form.title || !form.author || create.isPending}
                onClick={() => create.mutate(form)}
              >
                {create.isPending ? 'Adding…' : 'Add Book'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
