'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { examsAPI } from '@/lib/api';
import { Plus, ClipboardList } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ExamsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['exams', page],
    queryFn: () => examsAPI.list({ page, limit: 20 }).then(r => r.data),
  });

  const exams = data?.data || [];
  const pagination = data?.pagination;

  return (
    <DashboardLayout title="Exams & Grading" allowedRoles={['ADMIN', 'TEACHER', 'STUDENT']}>
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">{pagination?.total || 0} exams total</p>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Exam
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {exams.map((exam: any) => {
              const isPast = new Date(exam.examDate) < new Date();
              return (
                <div key={exam.id} className="card hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-primary-600" />
                    </div>
                    <span className={`badge ${isPast ? 'badge-gray' : 'badge-green'}`}>
                      {isPast ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{exam.subject?.name} • {exam.class?.name}</p>
                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm text-gray-500">
                    <span>{formatDate(exam.examDate)}</span>
                    <span>{exam.duration} min • {exam.totalMarks} marks</span>
                  </div>
                </div>
              );
            })}
            {!exams.length && (
              <div className="col-span-3 text-center py-12 text-gray-400">No exams scheduled</div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
