import LogStream from "../components/LogStream";
import { ShieldCheck, LogOut } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Dashboard Navbar */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">LogMetric Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
              <LogOut className="w-4 h-4" /> Exit to Homepage
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        <div className="mb-8 flex items-center justify-between">
           <div>
             <h1 className="text-2xl font-bold text-slate-900">Live Telemetry</h1>
             <p className="text-sm text-slate-500 mt-1">Real-time log ingestion and pattern matching feed.</p>
           </div>
        </div>

        {/* Dashboard Component */}
        <section className="relative">
          <LogStream />
        </section>

      </main>
    </div>
  );
}
