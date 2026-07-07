import React, { useState, useEffect } from 'react';
import { Landmark, Shield, User as UserIcon, LogOut, RefreshCw, Layers, ShieldAlert, Terminal } from 'lucide-react';
import { User } from './types';
import Login from './components/Login';
import BusinessPortal from './components/BusinessPortal';
import AdminPortal from './components/AdminPortal';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('banking_session_token'));
  const [user, setUser] = useState<User | null>(null);
  const [activePortal, setActivePortal] = useState<'business' | 'admin'>('business');
  const [isInitializing, setIsInitializing] = useState(true);

  // Validate session on load
  const validateSession = async (sessionToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        
        // Default routing based on roles
        if (data.user.role === 'BUSINESS_USER') {
          setActivePortal('business');
        } else if (data.user.role === 'DATA_ENGINEER') {
          setActivePortal('admin');
        } else {
          setActivePortal('business');
        }
      } else {
        // Clear stale session
        localStorage.removeItem('banking_session_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Session restoration failed:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
  setIsInitializing(false);
}, []);

  const handleLoginSuccess = (newToken: string, loggedInUser: User) => {
    localStorage.setItem('banking_session_token', newToken);
    setToken(newToken);
    setUser(loggedInUser);
    
    if (loggedInUser.role === 'BUSINESS_USER') {
      setActivePortal('business');
    } else if (loggedInUser.role === 'DATA_ENGINEER') {
      setActivePortal('admin');
    } else {
      setActivePortal('business');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('banking_session_token');
    setToken(null);
    setUser(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
        <span>Syncing platform session...</span>
      </div>
    );
  }

  if (!user || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Determine portal availability based on roles
  const canAccessAdmin = user.role === 'ADMIN' || user.role === 'DATA_ENGINEER' || user.role === 'ANALYST';
  const canAccessBusiness = true; // All roles can view basic business performance views

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      
      {/* Top Enterprise Corporate Header */}
      <header className="bg-slate-950 border-b border-slate-800/80 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-600/15 text-blue-400 rounded border border-blue-500/20">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-sm text-slate-200">ENTERPRISE BANKING</span>
              <span className="text-[10px] font-mono text-slate-500 font-semibold px-1.5 py-0.2 bg-slate-900 border border-slate-800 rounded">
                v1.2.0
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Snowflake Analytical Intelligence Hub</p>
          </div>
        </div>

        {/* Middle Dual Portal Switches */}
        <div className="hidden md:flex items-center p-1 bg-slate-900 rounded-lg border border-slate-800">
          <button
            onClick={() => setActivePortal('business')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              activePortal === 'business'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> Business Analytics
          </button>
          
          {canAccessAdmin && (
            <button
              onClick={() => setActivePortal('admin')}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activePortal === 'admin'
                  ? 'bg-red-600 text-white shadow-md shadow-red-900/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" /> Snowflake Admin
            </button>
          )}
        </div>

        {/* Right officer metadata & control */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs font-bold text-slate-300">{user.name}</span>
              <span className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full uppercase ${
                user.role === 'ADMIN' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                user.role === 'DATA_ENGINEER' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                user.role === 'ANALYST' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {user.role}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">{user.email}</p>
          </div>

          <div className="h-8 w-px bg-slate-800"></div>

          <button
            onClick={handleSignOut}
            title="Sign Out Session"
            className="p-2 bg-slate-900 hover:bg-rose-950/20 hover:text-rose-400 border border-slate-800 hover:border-rose-900/40 rounded-lg text-slate-400 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

      </header>

      {/* Portal Container */}
      <main className="flex-1 flex flex-col bg-slate-900">
        
        {/* Small screen Portal selector */}
        <div className="md:hidden bg-slate-950 px-6 py-2.5 border-b border-slate-850 flex justify-center gap-2">
          <button
            onClick={() => setActivePortal('business')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg ${
              activePortal === 'business' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            Business Portal
          </button>
          {canAccessAdmin && (
            <button
              onClick={() => setActivePortal('admin')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg ${
                activePortal === 'admin' ? 'bg-red-600 text-white' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Snowflake Portal
            </button>
          )}
        </div>

        {/* Portal Switching Rendering */}
        {activePortal === 'business' && (
          <BusinessPortal user={user} token={token} />
        )}

        {activePortal === 'admin' && canAccessAdmin && (
          <AdminPortal user={user} token={token} />
        )}

      </main>

    </div>
  );
}

