import React, { useRef, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Button } from '@/components/ui/button';
import { User, Mail, Shield, Camera, Loader2, Calendar, Clock, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

export default function Profile() {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.user_metadata?.full_name || 'Admin User');
  const [password, setPassword] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { data: activities = [] } = useQuery({
    queryKey: ['recent_activities'],
    queryFn: async () => {
      const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(5);
      return data || [];
    }
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const updates: any = { data: { full_name: name } };
      if (password) updates.password = password;
      
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      if (password) setPassword('');
    },
    onSuccess: () => {
      alert('Profile updated successfully');
      // In a real app we'd use a toast notification
    }
  });

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      
      // Convert to Base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = e.target?.result as string;
        
        // Update auth metadata
        const { error: updateError } = await supabase.auth.updateUser({
          data: { avatar_url: base64String }
        });

        if (updateError) {
          console.error('Error uploading avatar:', updateError);
          alert('Error uploading avatar');
        } else {
          window.location.reload();
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Error uploading avatar');
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h2>
      
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-8">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-2xl overflow-hidden shadow-sm border-4 border-white dark:border-gray-800">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={uploadAvatar} 
              accept="image/*" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-600 shadow-sm transition-colors"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{name}</h3>
            <p className="text-gray-500 dark:text-gray-400">Administrator</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" /> Personal Info
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-600 bg-transparent dark:text-white outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Role</label>
                <input type="text" defaultValue="Administrator" disabled className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 outline-none cursor-not-allowed" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" /> Security
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="email" defaultValue={user?.email} disabled className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 outline-none cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Change Password</label>
                <input 
                  type="password" 
                  placeholder="New password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-600 bg-transparent dark:text-white outline-none" 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" /> Account Details
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Joined Date</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'} disabled className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 outline-none cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Login</label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'} disabled className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 outline-none cursor-not-allowed" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-gray-400" /> Recent Activities
            </h4>
            <div className="space-y-3">
              {activities.length > 0 ? activities.map((activity: any) => (
                <div key={activity.id} className="flex flex-col p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{activity.action}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.details?.description || activity.action}</span>
                  <span className="text-xs text-gray-400 mt-2">{new Date(activity.created_at).toLocaleString()}</span>
                </div>
              )) : (
                <div className="text-sm text-gray-500">No recent activities found.</div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <Button variant="outline" className="rounded-xl border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Button>
          <Button 
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
