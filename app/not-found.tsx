import Link from "next/link";
import { Scale, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md animate-fade-in-up">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
          <Search className="w-10 h-10 text-slate-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-slate-900">Case Not Found</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            The document or analysis you&apos;re looking for doesn&apos;t exist in our case registry. 
            It may have expired (60-minute TTL) or the document ID may be incorrect.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-all flex items-center space-x-2 shadow-lg shadow-blue-500/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Risk Radar</span>
          </Link>
          <Link
            href="/trust"
            className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all flex items-center space-x-2"
          >
            <Scale className="w-4 h-4" />
            <span>Trust Dashboard</span>
          </Link>
        </div>
        <p className="text-[11px] text-slate-400">
          Error 404 · Section 9 — &quot;A contract which ceases to be enforceable by law becomes void when it ceases to be enforceable.&quot;
        </p>
      </div>
    </div>
  );
}
