import React, { useState, useEffect } from 'react';
import { Moon, Sun, Bell, Database, Globe, Key, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../components/ThemeProvider';
import { useAuthStore } from '../store/useAuthStore';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['settings', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('settings').select('*').eq('user_id', user.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Sync theme with DB on load
  useEffect(() => {
    if (settings?.theme && settings.theme !== theme) {
      setTheme(settings.theme as 'light' | 'dark' | 'system');
    }
  }, [settings?.theme]);

  const updateSettings = useMutation({
    mutationFn: async (updates: any) => {
      if (!user) return;
      const { error } = await supabase.from('settings').upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', user?.id] });
    }
  });

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    updateSettings.mutate({ theme: newTheme });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Workspace Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
            <Globe className="w-4 h-4" /> General
          </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          {/* Appearance */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h3>
            <div className="flex gap-4">
              <button 
                onClick={() => handleThemeChange('light')}
                className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-colors ${theme === 'light' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-gray-100 hover:border-gray-200 dark:border-gray-800 dark:hover:border-gray-700'}`}
              >
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <Sun className="w-6 h-6" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Light Mode</span>
              </button>
              
              <button 
                onClick={() => handleThemeChange('dark')}
                className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-colors ${theme === 'dark' ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-gray-100 hover:border-gray-200 dark:border-gray-800 dark:hover:border-gray-700'}`}
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-white">
                  <Moon className="w-6 h-6" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">Dark Mode</span>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-500 mb-2">Danger Zone</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Permanent actions that cannot be undone.</p>
            <div className="flex items-center justify-between p-4 border border-red-100 dark:border-red-900/50 rounded-xl bg-red-50/50 dark:bg-red-900/10">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Delete Workspace</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Remove all customers, campaigns, and logs.</p>
              </div>
              <Button variant="destructive" className="rounded-xl shadow-sm bg-red-600 hover:bg-red-700">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Data
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
