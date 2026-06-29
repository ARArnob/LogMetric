import { ShieldCheck, Activity, Search, Zap } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-50 via-white to-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      
      {/* Navbar */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-blue-700">LogMetric</span>
        </div>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-500">
          <a href="#" className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full">Home</a>
          <a href="#features" className="px-4 py-2 hover:text-slate-900 transition-colors rounded-full">Features</a>
          <a href="#how-it-works" className="px-4 py-2 hover:text-slate-900 transition-colors rounded-full">How It Works</a>
        </nav>

        <div className="flex items-center gap-4 text-sm font-medium">
          <Link href="/signin" className="text-slate-600 hover:text-slate-900 transition-colors">
            Sign In
          </Link>
          <Link href="/signup" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm shadow-blue-600/20">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center justify-center pt-16 pb-24 px-6">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold tracking-wide border border-blue-100/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Next-Gen Log Telemetry Engine
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Secure & Monitor Your Systems with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">Intelligent AI</span>
          </h1>
          
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mt-6">
            Advanced log ingestion with real-time pattern recognition, clustering, and comprehensive anomaly detection. Scale your telemetry instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link href="/signup" className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 w-full sm:w-auto justify-center">
              Get Started <ShieldCheck className="w-5 h-5" />
            </Link>
            <Link href="/dashboard" className="px-8 py-3.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-lg transition-all shadow-sm w-full sm:w-auto justify-center flex">
              View Live Demo
            </Link>
          </div>
          
          <div className="flex items-center justify-center gap-8 pt-12 text-sm font-medium text-slate-400">
             <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-500"/> No Installation</span>
             <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500"/> Real-time Processing</span>
             <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-blue-500"/> Ultra-low Latency</span>
          </div>
        </div>

        {/* Features Section */}
        <div id="features" className="w-full max-w-6xl mx-auto mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
            <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">High-Speed Ingestion</h3>
            <p className="text-slate-500 leading-relaxed">
              Asynchronous, message-driven architecture using RabbitMQ ensures logs are ingested instantly without blocking operations.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
            <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Pattern Recognition</h3>
            <p className="text-slate-500 leading-relaxed">
              Dynamic cleansers automatically extract signatures and generate SHA-256 pattern hashes to cluster similar log streams.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-shadow">
            <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Real-time Analytics</h3>
            <p className="text-slate-500 leading-relaxed">
              Pushed directly to Elasticsearch for high-speed indexing, enabling you to search and analyze millions of logs effortlessly.
            </p>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 text-center text-slate-400 text-sm">
        <p>© 2026 LogMetric Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
