import React, { useState } from 'react';
import { Shield, Key, Eye, EyeOff, Landmark, Activity, User as UserIcon } from 'lucide-react';
import { User, UserRole } from '../types';

interface LoginProps {
  onLoginSuccess: (token: string, user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDemoLogin = (userType: 'admin' | 'engineer' | 'analyst' | 'business') => {
    setUsername(userType);
    setPassword(userType + '123');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide both username and password credentials.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        // Try to retrieve any error payload or text; avoid calling json() on empty bodies.
        const text = await response.text();
        let errMsg = text || `Server returned ${response.status}`;
        try {
          const parsed = text ? JSON.parse(text) : null;
          if (parsed && (parsed.error || parsed.message)) errMsg = parsed.error || parsed.message;
        } catch (e) {
          // ignore JSON parse errors and keep text as message
        }
        throw new Error(errMsg || 'Authentication failed. Please verify credentials.');
      }

      const data = await response.json();
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Server connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login_container" className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden grid md:grid-cols-12">
        
        {/* Left Side: Brand & Technical Hook */}
        <div className="md:col-span-5 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 p-8 flex flex-col justify-between border-r border-slate-800 text-white">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
                <Landmark className="h-6 w-6" />
              </div>
              <span className="font-bold tracking-tight text-lg text-slate-100">ENTERPRISE BANKING</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight leading-snug text-white mb-4">
              Snowflake Analytics Platform
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              A dual-portal intelligence system providing high-fidelity customer dashboards, fraud detection and granular Snowflake pipeline administrative controls.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <Shield className="h-5 w-5 text-emerald-400 shrink-0" />
              <div className="text-xs text-slate-300">
                <span className="font-semibold block text-slate-200">Role-Based Access Control</span>
                Strict JWT tokenization and server-enforced API policies.
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800">
              <Activity className="h-5 w-5 text-blue-400 shrink-0" />
              <div className="text-xs text-slate-300">
                <span className="font-semibold block text-slate-200">Snowflake Engine</span>
                Connected to Snowflake schemas, internal stages, and Time Travel logs.
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Action Form & User Presets */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-center bg-slate-950">
          <div className="max-w-md w-full mx-auto">
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Portal Access Sign In</h2>
            <p className="text-slate-400 text-sm mt-1">Provide your credentials or select an enterprise profile below.</p>

            {error && (
              <div className="mt-4 p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                <span className="font-semibold">Error:</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin, engineer, analyst"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Security Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-800 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-lg text-sm shadow-md shadow-blue-900/20 hover:shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center"
              >
                {isLoading ? 'Verifying Credentials...' : 'Sign In to Portal'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-950 px-2.5 text-slate-500 font-semibold tracking-wider">
                  Preset Access Roles
                </span>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDemoLogin('admin')}
                className="p-3 text-left bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg transition-all text-slate-200 group cursor-pointer"
              >
                <div className="text-xs font-bold text-red-400 group-hover:text-red-300">ADMIN ROLE</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Full dual-portal & SQL access</div>
              </button>

              <button
                onClick={() => handleDemoLogin('engineer')}
                className="p-3 text-left bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg transition-all text-slate-200 group cursor-pointer"
              >
                <div className="text-xs font-bold text-amber-400 group-hover:text-amber-300">DATA ENGINEER</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Snowflake stages, pipelines & sql</div>
              </button>

              <button
                onClick={() => handleDemoLogin('analyst')}
                className="p-3 text-left bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg transition-all text-slate-200 group cursor-pointer"
              >
                <div className="text-xs font-bold text-cyan-400 group-hover:text-cyan-300">RISK ANALYST</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Business portal + SELECT workspace</div>
              </button>

              <button
                onClick={() => handleDemoLogin('business')}
                className="p-3 text-left bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg transition-all text-slate-200 group cursor-pointer"
              >
                <div className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300">BUSINESS USER</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Business analytics dashboard only</div>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
