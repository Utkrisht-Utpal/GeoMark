import React, { useState } from 'react';
import type { User } from '../types';
import { api } from '../services/api';
import { ShieldCheck, MapPin, Key, UserCheck, AlertCircle, Loader2 } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (token: string, user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [role, setRole] = useState<'STUDENT' | 'WARDEN'>('STUDENT');
  const [identifier, setIdentifier] = useState('21BCS1001');
  const [password, setPassword] = useState('Student@123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.login(identifier, password, role);
      onLoginSuccess(res.data.token, res.data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const setMockAccount = (mockId: string, mockPass: string, mockRole: 'STUDENT' | 'WARDEN') => {
    setRole(mockRole);
    setIdentifier(mockId);
    setPassword(mockPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <MapPin className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">GeoMark</h1>
        </div>
        <p className="mt-2 text-center text-sm text-slate-600">
          Smart Hostel Attendance Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-100">
          {/* Role Selector Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setRole('STUDENT');
                setIdentifier('21BCS1001');
                setPassword('Student@123');
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all ${
                role === 'STUDENT'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              Student
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('WARDEN');
                setIdentifier('warden.shivalik');
                setPassword('Warden@123');
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md transition-all ${
                role === 'WARDEN'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Warden
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 border border-red-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 mb-1">
                {role === 'STUDENT' ? 'Roll Number' : 'Warden Username'}
              </label>
              <input
                id="identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={role === 'STUDENT' ? 'e.g. 21BCS1001' : 'e.g. warden.shivalik'}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                />
                <Key className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 transition-colors shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In to GeoMark'
              )}
            </button>
          </form>

          {/* Quick Mock Login Selector for Evaluation */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2 text-center">
              Evaluation Mock Credentials
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setMockAccount('21BCS1001', 'Student@123', 'STUDENT')}
                className="p-2 rounded border border-slate-200 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-semibold block text-slate-800">Aarav Sharma</span>
                <span className="text-slate-500">21BCS1001 (Student)</span>
              </button>
              <button
                type="button"
                onClick={() => setMockAccount('21BCS1002', 'Student@123', 'STUDENT')}
                className="p-2 rounded border border-slate-200 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-semibold block text-slate-800">Rohan Mehta</span>
                <span className="text-slate-500">21BCS1002 (Student)</span>
              </button>
              <button
                type="button"
                onClick={() => setMockAccount('warden.shivalik', 'Warden@123', 'WARDEN')}
                className="p-2 rounded border border-slate-200 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-semibold block text-slate-800">Dr. Rajesh Kumar</span>
                <span className="text-slate-500">warden.shivalik (Shivalik)</span>
              </button>
              <button
                type="button"
                onClick={() => setMockAccount('warden.aravali', 'Warden@123', 'WARDEN')}
                className="p-2 rounded border border-slate-200 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-semibold block text-slate-800">Prof. Sunita Sharma</span>
                <span className="text-slate-500">warden.aravali (Aravali)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
