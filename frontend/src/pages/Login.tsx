import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, Sparkles, Target, BarChart3, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const setUser = useAuthStore((state) => state.setUser);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setSession(data.session);
      setUser(data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Left section: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-8 sm:px-16 md:px-24 bg-[#FAFAFA] relative z-10 py-12">
        
        {/* Subtle background patterns for left side */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        <div className="w-full max-w-[500px] flex flex-col items-center relative z-10">
          
          <div className="flex flex-col items-center text-center space-y-0 mb-8">
            <img src="/logo.png" alt="Logo" className="w-[400px] h-[400px] object-contain drop-shadow-xl -mb-12" onError={(e) => { e.currentTarget.style.display='none'; }} />
            <div className="space-y-2">
              <span className="text-5xl font-black text-gray-900 tracking-tight block">Campaign Copilot</span>
              <span className="text-lg text-gray-500 block">AI-native Customer Engagement Platform</span>
            </div>
          </div>

          <div className="w-full bg-white/80 backdrop-blur-xl border border-gray-200 shadow-2xl rounded-3xl p-10 md:p-12 relative">
            
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Sign in to your workspace</h1>
              <p className="text-gray-500 text-base">Welcome back! Continue managing your campaigns.</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-3 border border-red-100 animate-in fade-in slide-in-from-top-2 mb-8">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Email address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600 text-gray-400">
                      <Mail className="h-6 w-6" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full h-14 pl-12 pr-4 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all outline-none bg-gray-50/50 focus:bg-white text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal text-base"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-700">Password</label>
                    <Link to="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors">Forgot password?</Link>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-600 text-gray-400">
                      <Lock className="h-6 w-6" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full h-14 pl-12 pr-4 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all outline-none bg-gray-50/50 focus:bg-white text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal text-base"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center pt-2">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-3 block text-sm font-medium text-gray-700 cursor-pointer select-none">
                  Remember me
                </label>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-14 mt-4 flex justify-center items-center rounded-xl shadow-[0_8px_30px_rgb(79,70,229,0.2)] text-lg font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all duration-300 gap-2 group hover:shadow-[0_8px_40px_rgb(79,70,229,0.4)] hover:-translate-y-1"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
                {!isLoading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />}
              </Button>
            </form>

            <div className="mt-8 text-center border-t border-gray-100 pt-6">
              <span className="text-gray-500">Don't have an account? </span>
              <Link to="/signup" className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">Sign up for a new account</Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right section: Hero Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#0B1026] via-[#131E48] to-[#29165B] flex-col items-center justify-center p-16 relative overflow-hidden">
        
        {/* Dynamic Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-500/20 blur-[140px] rounded-full mix-blend-screen pointer-events-none animate-pulse duration-[10s]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-violet-600/20 blur-[140px] rounded-full mix-blend-screen pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-xl">
          <div className="mb-16">
            <h2 className="text-6xl font-black text-white mb-6 leading-[1.1] tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400">AI-Powered</span> <br/>
              Customer <br/>
              Engagement
            </h2>
            <p className="text-xl text-indigo-100/80 font-medium leading-relaxed max-w-md">
              Segment customers, launch campaigns, and analyze conversions with AI assistance.
            </p>
          </div>
          
          {/* Elegant Floating Cards */}
          <div className="space-y-5">
            
            <div className="flex items-center gap-5 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl transform hover:-translate-y-1 transition-all duration-300 group cursor-default">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors">
                <span className="text-3xl">🤖</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">AI Copilot</h3>
                <p className="text-indigo-200/70 text-sm font-medium">Draft campaigns and audiences instantly</p>
              </div>
            </div>

            <div className="flex items-center gap-5 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl transform hover:-translate-y-1 transition-all duration-300 group cursor-default ml-8">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors">
                <span className="text-3xl">🎯</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Customer Segmentation</h3>
                <p className="text-indigo-200/70 text-sm font-medium">Hyper-targeted behavioral grouping</p>
              </div>
            </div>

            <div className="flex items-center gap-5 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl transform hover:-translate-y-1 transition-all duration-300 group cursor-default">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors">
                <span className="text-3xl">📨</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Multi-channel Delivery</h3>
                <p className="text-indigo-200/70 text-sm font-medium">WhatsApp • Email • SMS • RCS</p>
              </div>
            </div>

            <div className="flex items-center gap-5 bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl transform hover:-translate-y-1 transition-all duration-300 group cursor-default ml-8">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors">
                <span className="text-3xl">📈</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Campaign Analytics</h3>
                <p className="text-indigo-200/70 text-sm font-medium">Real-time engagement tracking</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
