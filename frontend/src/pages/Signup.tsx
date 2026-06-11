import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '../lib/supabase';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data?.session) {
        navigate('/dashboard');
      } else {
        setSuccess('Check your email for the confirmation link to complete registration.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen h-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#0A0A0B] font-inter">
      <div className="flex-1 flex items-center justify-center p-4 md:p-6 relative">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-indigo-50/50 dark:bg-indigo-950/20" />
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-200 dark:bg-purple-900/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
          <div className="absolute top-40 -left-40 w-96 h-96 bg-indigo-200 dark:bg-indigo-900/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-40 left-20 w-96 h-96 bg-blue-200 dark:bg-blue-900/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />
        </div>

        <div className="w-full max-w-[450px] flex flex-col items-center relative z-10">
          <div className="flex flex-col items-center text-center space-y-0 mb-6">
            <img src="/logo.png" alt="Logo" className="w-[200px] h-[200px] object-contain drop-shadow-xl -mb-4" onError={(e) => { e.currentTarget.style.display='none'; }} />
            <div className="space-y-2">
              <span className="text-5xl font-black text-gray-900 tracking-tight block">Campaign Copilot</span>
              <span className="text-lg text-gray-500 block">AI-native Customer Engagement Platform</span>
            </div>
          </div>

          <div className="w-full bg-white/80 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-3xl p-8 relative">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Create your workspace</h1>
              <p className="text-gray-500 text-base">Sign up to get started.</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-3 border border-red-100 mb-8">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm flex items-start gap-3 border border-green-100 mb-6">
                <p>{success}</p>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 focus:bg-white transition-all outline-none text-base"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Email address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 focus:bg-white transition-all outline-none text-base"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 focus:bg-white transition-all outline-none text-base"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 mt-2 bg-gray-900 hover:bg-indigo-600 text-white rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-gray-900/20 hover:shadow-indigo-600/25 flex items-center justify-center gap-2 group"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
                {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <span className="text-gray-500">Already have an account? </span>
              <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
