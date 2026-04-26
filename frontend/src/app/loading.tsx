export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50/50 to-violet-50/50 p-6">
      <div className="w-full max-w-lg rounded-3xl border border-white/70 bg-white/90 backdrop-blur-md shadow-card-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/2 bg-slate-200 rounded-lg" />
          <div className="h-4 w-3/4 bg-slate-200 rounded-lg" />
          <div className="h-24 w-full bg-slate-100 rounded-2xl" />
          <div className="h-10 w-40 bg-indigo-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
