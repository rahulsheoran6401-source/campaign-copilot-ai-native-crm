import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Users, Megaphone, Bot, BarChart3, Settings, Bell, Search, LogOut, User, Activity, Clock, ShoppingCart, Package, Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore();
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await supabase.from('activity_logs').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(5);
      return data || [];
    }
  });

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
        <button onClick={onClose} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Close</button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">No new notifications.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {activities.map(activity => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {activity.action}
                  {activity.details?.name && <span className="font-semibold text-indigo-600 dark:text-indigo-400 ml-1">"{activity.details.name}"</span>}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {new Date(activity.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ customers: any[], campaigns: any[], ai: any[] }>({ customers: [], campaigns: [], ai: [] });
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '🏠' },
    { name: 'Customers', path: '/customers', icon: '👥' },
    { name: 'Orders', path: '/orders', icon: '📦' },
    { name: 'Campaigns', path: '/campaigns', icon: '📢' },
    { name: 'Delivery Center', path: '/delivery', icon: '📨' },
    { name: 'AI Copilot', path: '/copilot', icon: '🤖' },
    { name: 'Analytics', path: '/analytics', icon: '📊' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const fetchSearch = async () => {
      if (searchQuery.length < 2) {
        setSearchResults({ customers: [], campaigns: [], ai: [] });
        return;
      }
      
      setIsSearching(true);
      const [
        { data: customers },
        { data: campaigns },
        { data: ai }
      ] = await Promise.all([
        supabase.from('customers').select('*').eq('user_id', user?.id).ilike('name', `%${searchQuery}%`).limit(3),
        supabase.from('campaigns').select('*').eq('user_id', user?.id).ilike('name', `%${searchQuery}%`).limit(3),
        supabase.from('ai_conversations').select('*').eq('user_id', user?.id)
      ]);

      let aiMatches: any[] = [];
      if (ai && ai.length > 0) {
        const convo = ai[0];
        if (convo.messages) {
          aiMatches = convo.messages.filter((m: any) => m.content.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 3);
        }
      }

      setSearchResults({
        customers: customers || [],
        campaigns: campaigns || [],
        ai: aiMatches
      });
      setIsSearching(false);
    };

    const timer = setTimeout(fetchSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0A0A0B] overflow-hidden">
       <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0 overflow-y-auto">
        <div className="flex flex-col justify-between min-h-full">
          <div>
            <Link to="/dashboard" className="p-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="bg-white rounded-2xl p-1 shadow-sm shrink-0">
                <img src="/logo.png" alt="Logo" className="w-[65px] h-[65px] object-contain" onError={(e) => { e.currentTarget.style.display='none'; }} />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none truncate" title="Campaign Copilot">Campaign Copilot</span>
            </Link>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium',
                    isActive 
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  <span className={cn("text-[22px] mr-3 transition-transform duration-200", isActive ? "scale-110 drop-shadow-md" : "grayscale group-hover:grayscale-0 group-hover:scale-110")}>{item.icon as string}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-1 relative">
          <Link
  to="/settings"
  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
>
  <Settings className="w-5 h-5 transition-transform duration-200 group-hover:rotate-45" />
  Settings
</Link>

          <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0 overflow-hidden">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="User" className="w-full h-full object-cover" />
                ) : (
                  (user?.user_metadata?.full_name || 'A').charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.user_metadata?.full_name || 'Admin'}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</span>
              </div>
            </button>
            
            {showProfileMenu && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 py-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">
                <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <User className="w-4 h-4" /> Profile
                </Link>
                <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      </aside>

      <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative w-full max-w-[1600px] mx-auto">
        <header className="h-[76px] bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white capitalize tracking-tight flex items-center gap-3">
              {location.pathname.replace('/', '') || 'Dashboard'}
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Global Search */}
            <div className="relative hidden md:block" ref={searchRef}>
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                id="global-search"
                type="text" 
                placeholder="Search everywhere..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoComplete="off"
                className="pl-9 pr-4 py-2 w-64 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-white"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="hidden sm:inline-block border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 px-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">⌘K</kbd>
              </div>

              {searchQuery.length >= 2 && (
                <div className="absolute top-full mt-2 w-80 right-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 max-h-96 overflow-y-auto z-50">
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Searching...</div>
                  ) : (
                    <>
                      {searchResults.customers.length > 0 && (
                        <div className="mb-2">
                          <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customers</div>
                          {searchResults.customers.map(c => (
                            <Link key={c.id} to={`/customers`} onClick={() => setSearchQuery('')} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                              <Users className="w-4 h-4 text-blue-500" />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{c.email}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                      
                      {searchResults.campaigns.length > 0 && (
                        <div className="mb-2">
                          <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Campaigns</div>
                          {searchResults.campaigns.map(c => (
                            <Link key={c.id} to={`/campaigns`} onClick={() => setSearchQuery('')} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                              <Megaphone className="w-4 h-4 text-indigo-500" />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{c.message}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {searchResults.ai.length > 0 && (
                        <div className="mb-2">
                          <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Copilot</div>
                          {searchResults.ai.map((m, idx) => (
                            <Link key={idx} to={`/copilot`} onClick={() => setSearchQuery('')} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                              <Bot className="w-4 h-4 text-purple-500" />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{m.role} Message</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{m.content}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}

                      {searchResults.customers.length === 0 && searchResults.campaigns.length === 0 && searchResults.ai.length === 0 && (
                        <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No results found for "{searchQuery}"</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Notification Center */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Bell className="w-5 h-5" />
              </button>
              
              {showNotifications && (
                <NotificationDropdown onClose={() => setShowNotifications(false)} />
              )}
            </div>
          </div>
        </header>
        
        <div className="p-6 pb-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
