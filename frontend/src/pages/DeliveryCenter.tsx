import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, Eye, MousePointerClick, TrendingUp, Send, MessageSquare, Mail, Smartphone, BellRing, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logActivity } from '../lib/activity';
import { useAuthStore } from '../store/useAuthStore';

const channels = [
  { id: 'WhatsApp', icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-100' },
  { id: 'Email', icon: Mail, color: 'text-blue-500', bg: 'bg-blue-100' },
  { id: 'SMS', icon: Smartphone, color: 'text-purple-500', bg: 'bg-purple-100' },
  { id: 'Push', icon: BellRing, color: 'text-orange-500', bg: 'bg-orange-100' },
];

export default function DeliveryCenter() {
  const { user } = useAuthStore();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Running' | 'Completed'>('Draft');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const queryClient = useQueryClient();

  const [metrics, setMetrics] = useState({
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    converted: 0,
    revenue: 0,
  });

  const { data: allCampaigns = [] } = useQuery({
    queryKey: ['all_campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaigns').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const campaigns = statusFilter === 'All' ? allCampaigns : allCampaigns.filter(c => c.status === statusFilter || (statusFilter === 'Draft' && c.status === 'Scheduled'));

  const selectedCampaign = allCampaigns.find(c => c.id === selectedCampaignId);

  // Update metrics state if picking a completed campaign without simulating
  useEffect(() => {
    if (selectedCampaign?.status === 'Completed' && !isSimulating && !simulationComplete) {
      setMetrics({ sent: selectedCampaign.audience_size || 0, delivered: 0, opened: 0, clicked: 0, converted: 0, revenue: 0 }); // We would load real metrics here ideally, but for demo UI reset is fine until Re-simulate
    } else if (!isSimulating && !simulationComplete) {
      setMetrics({ sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0, revenue: 0 });
    }
  }, [selectedCampaignId, selectedCampaign?.status, isSimulating, simulationComplete]);

  const startSimulation = async () => {
    if (!selectedCampaign) return;
    setIsSimulating(true);
    setSimulationComplete(false);
    setMetrics({ sent: 0, delivered: 0, opened: 0, clicked: 0, converted: 0, revenue: 0 });

    // If re-simulating a completed campaign, clear old logs first
    if (selectedCampaign.status === 'Completed') {
      await supabase.from('campaign_events').delete().eq('campaign_id', selectedCampaignId);
      await supabase.from('communication_logs').delete().eq('campaign_id', selectedCampaignId);
    }

    const targetAudience = selectedCampaign.audience_size || 1000;
    
    // Formula calculations
    const delRate = 0.92 + Math.random() * 0.05; // 92-97%
    const deliveredFinal = Math.floor(targetAudience * delRate);

    let openRate = 0;
    switch(selectedCampaign.channel) {
      case 'WhatsApp': openRate = 0.65 + Math.random() * 0.15; break; // 65-80%
      case 'Email': openRate = 0.25 + Math.random() * 0.20; break;    // 25-45%
      case 'SMS': openRate = 0.35 + Math.random() * 0.20; break;      // 35-55%
      case 'Push': openRate = 0.20 + Math.random() * 0.20; break;     // 20-40%
      default: openRate = 0.30;
    }
    const openedFinal = Math.floor(deliveredFinal * openRate);
    
    const clickRate = 0.25 + Math.random() * 0.15; // 25-40%
    const clickedFinal = Math.floor(openedFinal * clickRate);
    
    const convRate = 0.10 + Math.random() * 0.10; // 10-20%
    const convertedFinal = Math.floor(clickedFinal * convRate);
    
    const revenueFinal = convertedFinal * 450; // 450 rev per conversion

    // Animate metrics
    const duration = 4000;
    const steps = 40;
    const interval = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setMetrics({
        sent: Math.floor(targetAudience * easeProgress),
        delivered: Math.floor(deliveredFinal * easeProgress),
        opened: Math.floor(openedFinal * easeProgress),
        clicked: Math.floor(clickedFinal * easeProgress),
        converted: Math.floor(convertedFinal * easeProgress),
        revenue: Math.floor(revenueFinal * easeProgress),
      });

      if (currentStep >= steps) {
        clearInterval(timer);
        finishSimulation(targetAudience, deliveredFinal, openedFinal, clickedFinal, convertedFinal, revenueFinal);
      }
    }, interval);
  };

  const finishSimulation = async (targetAudience: number, delivered: number, opened: number, clicked: number, converted: number, revenue: number) => {
    try {
      // 1. Log events
      const events = [
        { campaign_id: selectedCampaignId, event_type: 'Sent', revenue_generated: 0, user_id: user?.id },
        { campaign_id: selectedCampaignId, event_type: 'Delivered', revenue_generated: 0, user_id: user?.id },
        { campaign_id: selectedCampaignId, event_type: 'Opened', revenue_generated: 0, user_id: user?.id },
        { campaign_id: selectedCampaignId, event_type: 'Clicked', revenue_generated: 0, user_id: user?.id },
        { campaign_id: selectedCampaignId, event_type: 'Converted', revenue_generated: revenue, user_id: user?.id },
      ];
      await supabase.from('campaign_events').insert(events);

      // 2. Generate dummy communication logs to reflect in analytics
      const logs = Array.from({ length: 10 }).map((_, i) => ({
        campaign_id: selectedCampaignId,
        status: i < 2 ? 'Sent' : i < 4 ? 'Delivered' : i < 6 ? 'Opened' : i < 8 ? 'Clicked' : 'Converted',
        channel: selectedCampaign?.channel || 'Email',
        user_id: user?.id
      }));
      await supabase.from('communication_logs').insert(logs);

      // 3. Update campaign status
      await supabase.from('campaigns').update({ status: 'Completed', updated_at: new Date().toISOString() }).eq('id', selectedCampaignId);

      // 3.5 Create fake orders for converted customers to tie revenue to actual data
      if (converted > 0 && revenue > 0) {
        const { data: customers } = await supabase.from('customers').select('id, lifetime_value').eq('user_id', user?.id).limit(converted);
        if (customers && customers.length > 0) {
          const amountPerOrder = Math.floor(revenue / converted);
          const fakeOrders = Array.from({ length: converted }).map((_, i) => ({
            customer_id: customers[i % customers.length].id,
            amount: amountPerOrder,
            status: 'Delivered',
            user_id: user?.id
          }));
          await supabase.from('orders').insert(fakeOrders);
          
          // Also update lifetime value for those customers
          for (const c of customers) {
            await supabase.from('customers').update({ lifetime_value: (c.lifetime_value || 0) + amountPerOrder }).eq('id', c.id);
          }
        }
      }

      // 4. Log Activity
      await logActivity(`Simulated Delivery`, 'Campaign', selectedCampaignId, { description: `Campaign "${selectedCampaign?.name}" was successfully delivered and generated ₹${revenue.toLocaleString()}` });

      queryClient.invalidateQueries();
      setIsSimulating(false);
      setSimulationComplete(true);
    } catch (e) {
      console.error(e);
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Delivery Center</h2>
        <p className="text-base text-gray-500 mt-2">Simulate real-time campaign delivery across multiple channels.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Controls */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm col-span-1 space-y-8">
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Campaign Filter</label>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-xl">
              {['Draft', 'Running', 'Completed', 'All'].map(status => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status as any);
                    setSelectedCampaignId('');
                    setSimulationComplete(false);
                  }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${statusFilter === status ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Select Campaign</label>
            <select 
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-base rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-4 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              value={selectedCampaignId}
              onChange={(e) => { setSelectedCampaignId(e.target.value); setSimulationComplete(false); }}
              disabled={isSimulating}
            >
              <option value="">-- Choose a Campaign --</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.channel})</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Active Channels</label>
            <div className="grid grid-cols-2 gap-3">
              {channels.map(c => {
                const isActive = selectedCampaign?.channel === c.id || c.id === 'Email'; // Email always active as fallback
                const Icon = c.icon;
                return (
                  <div key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isActive ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
                    <div className={`p-2 rounded-lg ${c.bg} ${c.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm text-gray-900">{c.id}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <Button 
            className="w-full py-6 text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all"
            size="lg"
            disabled={!selectedCampaignId || isSimulating}
            onClick={startSimulation}
            variant={selectedCampaign?.status === 'Completed' && !simulationComplete ? 'outline' : 'default'}
          >
            {isSimulating ? (
              <span className="flex items-center gap-2 animate-pulse text-white">
                <Send className="w-5 h-5" /> Sending...
              </span>
            ) : simulationComplete ? (
              <span className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="w-5 h-5" /> Delivered Successfully
              </span>
            ) : selectedCampaign?.status === 'Completed' ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" /> Re-Simulate Delivery
              </span>
            ) : (
              <span className="flex items-center gap-2 text-white">
                <Play className="w-5 h-5" /> Simulate Delivery
              </span>
            )}
          </Button>
        </div>

        {/* Live Metrics */}
        <div className="col-span-1 lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Send className="w-6 h-6" /></div>
                <span className="text-gray-500 font-medium">Sent</span>
              </div>
              <span className="text-4xl font-bold text-gray-900 tabular-nums">{metrics.sent.toLocaleString()}</span>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-2xl"><CheckCircle2 className="w-6 h-6" /></div>
                <span className="text-gray-500 font-medium">Delivered</span>
              </div>
              <span className="text-4xl font-bold text-gray-900 tabular-nums">{metrics.delivered.toLocaleString()}</span>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><Eye className="w-6 h-6" /></div>
                <span className="text-gray-500 font-medium">Opened</span>
              </div>
              <span className="text-4xl font-bold text-gray-900 tabular-nums">{metrics.opened.toLocaleString()}</span>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl"><MousePointerClick className="w-6 h-6" /></div>
                <span className="text-gray-500 font-medium">Clicked</span>
              </div>
              <span className="text-4xl font-bold text-gray-900 tabular-nums">{metrics.clicked.toLocaleString()}</span>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-pink-100 text-pink-600 rounded-2xl"><TrendingUp className="w-6 h-6" /></div>
                <span className="text-gray-500 font-medium">Converted</span>
              </div>
              <span className="text-4xl font-bold text-gray-900 tabular-nums">{metrics.converted.toLocaleString()}</span>
            </div>

            <div className="bg-indigo-600 p-6 rounded-3xl shadow-lg shadow-indigo-600/20 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-3 bg-white/20 text-white rounded-2xl"><TrendingUp className="w-6 h-6" /></div>
                <span className="text-indigo-100 font-medium text-lg">Revenue</span>
              </div>
              <span className="text-4xl font-bold text-white tabular-nums relative z-10">₹{metrics.revenue.toLocaleString()}</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
