import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter, MoreHorizontal, Play, Pause, Copy, Trash2, Edit, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logActivity } from '../lib/activity';
import { useAuthStore } from '../store/useAuthStore';

export default function Campaigns() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  // Modal state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newChannel, setNewChannel] = useState('Email');
  const [newAudience, setNewAudience] = useState(1000);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaigns').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const saveCampaign = useMutation({
    mutationFn: async (campaignData: any) => {
      if (editingId) {
        const { data, error } = await supabase.from('campaigns').update(campaignData).eq('id', editingId).select().single();
        if (error) throw error;
        await logActivity('Updated campaign', 'Campaign', editingId, { name: campaignData.name });
        return data;
      } else {
        const payload = { ...campaignData, user_id: user?.id };
        const { data, error } = await supabase.from('campaigns').insert([payload]).select().single();
        if (error) throw error;
        await logActivity('Created campaign', 'Campaign', data.id, { name: campaignData.name });
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      closeModal();
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, name }: { id: string, status: string, name?: string }) => {
      const { error } = await supabase.from('campaigns').update({ status }).eq('id', id);
      if (error) throw error;
      
      await logActivity(`Changed campaign status to ${status}`, 'Campaign', id, { name });
      
      if (status === 'Running') {
        fetch('http://localhost:5000/api/campaigns/' + id + '/trigger', { method: 'POST' }).catch(console.error);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] })
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      if (window.confirm('Are you sure you want to delete this campaign?')) {
        const { error } = await supabase.from('campaigns').delete().eq('id', id);
        if (error) throw error;
        await logActivity('Deleted campaign', 'Campaign', id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] })
  });

  const duplicateCampaign = useMutation({
    mutationFn: async (campaign: any) => {
      const { id, created_at, updated_at, status, ...rest } = campaign;
      const { data, error } = await supabase.from('campaigns').insert([{
        ...rest,
        name: `${campaign.name} (Copy)`,
        status: 'Draft',
        user_id: user?.id
      }]).select().single();
      if (error) throw error;
      await logActivity('Duplicated campaign', 'Campaign', data.id, { name: data.name });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] })
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let status = 'Draft';
    let scheduled_at = null;
    
    if (scheduleDate && scheduleTime) {
      status = 'Scheduled';
      scheduled_at = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    }

    saveCampaign.mutate({
      name: newName,
      message: newMessage,
      channel: newChannel,
      audience_size: newAudience,
      status: editingId ? undefined : status, // keep status if editing, unless we want to reset
      scheduled_at
    });
  };

  const openEditModal = (campaign: any) => {
    setEditingId(campaign.id);
    setNewName(campaign.name);
    setNewMessage(campaign.message);
    setNewChannel(campaign.channel);
    setNewAudience(campaign.audience_size || 1000);
    
    if (campaign.scheduled_at) {
      const d = new Date(campaign.scheduled_at);
      setScheduleDate(d.toISOString().split('T')[0]);
      setScheduleTime(d.toTimeString().split(' ')[0].slice(0, 5));
    } else {
      setScheduleDate('');
      setScheduleTime('');
    }
    
    setShowCreateModal(true);
    setActiveMenu(null);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingId(null);
    setNewName(''); setNewMessage(''); setScheduleDate(''); setScheduleTime('');
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.status?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Running': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'Completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Paused': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Scheduled': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'; // Draft
    }
  };

  return (
    <div className="space-y-6" onClick={() => setActiveMenu(null)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Campaigns</h2>
          <p className="text-base text-gray-500 mt-1">Create, schedule, and manage your marketing campaigns.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { setEditingId(null); setShowCreateModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Campaign
        </Button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['All', 'Draft', 'Scheduled', 'Running', 'Paused', 'Completed'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === status 
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800 dark:hover:bg-gray-800'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search campaigns..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-transparent dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-base text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-base font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4">Campaign Name</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Channel</th>
                <th className="px-6 py-4">Audience</th>
                <th className="px-6 py-4">Schedule</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading campaigns...</td></tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No campaigns found.</td></tr>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-lg text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{campaign.name}</p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">{campaign.message}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {campaign.channel}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-bold text-xl text-gray-900 dark:text-white">{campaign.audience_size?.toLocaleString() || 0}</span>
                    </td>
                    <td className="px-6 py-5 text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-2 text-base font-medium">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        {campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleDateString() : 'Immediate'}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === campaign.id ? null : campaign.id);
                        }}
                        className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      
                      {activeMenu === campaign.id && (
                        <div className="absolute right-10 top-10 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden z-10 animate-in fade-in zoom-in-95">
                          <div className="py-1">
                            <button 
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              onClick={() => openEditModal(campaign)}
                            >
                              <Edit className="w-4 h-4" /> Edit
                            </button>
                            <button 
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              onClick={() => { duplicateCampaign.mutate(campaign); setActiveMenu(null); }}
                            >
                              <Copy className="w-4 h-4" /> Duplicate
                            </button>
                            
                            {(campaign.status === 'Draft' || campaign.status === 'Paused' || campaign.status === 'Scheduled') && (
                              <button 
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                                onClick={() => { updateStatus.mutate({ id: campaign.id, status: 'Running' }); setActiveMenu(null); }}
                              >
                                <Play className="w-4 h-4" /> Start / Resume
                              </button>
                            )}
                            
                            {campaign.status === 'Running' && (
                              <button 
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                                onClick={() => { updateStatus.mutate({ id: campaign.id, status: 'Paused' }); setActiveMenu(null); }}
                              >
                                <Pause className="w-4 h-4" /> Pause
                              </button>
                            )}

                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                            
                            <button 
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => { deleteCampaign.mutate(campaign.id); setActiveMenu(null); }}
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
             <h3 className="text-xl font-bold mb-4 dark:text-white">
               {editingId ? 'Edit Campaign' : 'Create New Campaign'}
             </h3>
             <form onSubmit={handleCreateSubmit} className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Name</label>
                 <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent dark:text-white" placeholder="e.g. Summer Sale" />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message Content</label>
                 <textarea required value={newMessage} onChange={e => setNewMessage(e.target.value)} rows={3} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent dark:text-white" placeholder="Hello {{name}}, check out our new deals!"></textarea>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Channel</label>
                   <select value={newChannel} onChange={e => setNewChannel(e.target.value)} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent dark:text-white">
                     <option>Email</option>
                     <option>WhatsApp</option>
                     <option>SMS</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
                   <select value={newAudience} onChange={e => setNewAudience(parseInt(e.target.value))} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent dark:text-white">
                     <option value={150}>Inactive Users (150)</option>
                     <option value={1000}>All Customers (1000)</option>
                     <option value={45}>High Spenders (45)</option>
                   </select>
                 </div>
               </div>
               
               <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                 <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Calendar className="w-4 h-4"/> Schedule (Optional)</h4>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Date</label>
                     <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent dark:text-white" />
                   </div>
                   <div>
                     <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Time</label>
                     <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent dark:text-white" />
                   </div>
                 </div>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Leave blank to save as Draft.</p>
               </div>

               <div className="flex justify-end gap-3 mt-6">
                 <Button type="button" variant="outline" onClick={closeModal} className="dark:text-white dark:border-gray-700">Cancel</Button>
                 <Button type="submit" className="bg-indigo-600 text-white" disabled={saveCampaign.isPending}>
                   {saveCampaign.isPending ? 'Saving...' : 'Save Campaign'}
                 </Button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
