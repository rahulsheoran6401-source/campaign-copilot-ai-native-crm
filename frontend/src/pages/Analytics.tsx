import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Users, Megaphone, DollarSign, Activity, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CSVLink } from 'react-csv';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function Analytics() {
  const { user } = useAuthStore();
  const [dateRange, setDateRange] = useState('30days');
  const navigate = useNavigate();

  // Fetch campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns_analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaigns').select('*').eq('user_id', user?.id);
      if (error) throw error;
      return data;
    }
  });

  const getStartDate = (range: string) => {
    const d = new Date();
    if (range === '7days') d.setDate(d.getDate() - 7);
    else if (range === '30days') d.setDate(d.getDate() - 30);
    else if (range === '90days') d.setDate(d.getDate() - 90);
    return d.toISOString();
  };

  // Fetch campaign events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['campaign_events', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaign_events').select('*').eq('user_id', user?.id).gte('created_at', getStartDate(dateRange));
      if (error) throw error;
      return data;
    }
  });

  // Fetch communication logs
  const { data: logs = [] } = useQuery({
    queryKey: ['communication_logs', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.from('communication_logs').select('*').eq('user_id', user?.id).gte('timestamp', getStartDate(dateRange));
      if (error) throw error;
      return data;
    }
  });

  // Calculate stats
  const totalSent = logs.length;
  const totalDelivered = logs.filter(l => l.status === 'Delivered' || l.status === 'Opened' || l.status === 'Clicked' || l.status === 'Converted').length;
  const totalOpened = logs.filter(l => l.status === 'Opened' || l.status === 'Clicked' || l.status === 'Converted').length;
  const totalClicked = logs.filter(l => l.status === 'Clicked' || l.status === 'Converted').length;
  const totalConverted = logs.filter(l => l.status === 'Converted').length;

  const deliveryRate = totalSent ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0.0';
  const openRate = totalDelivered ? ((totalOpened / totalDelivered) * 100).toFixed(1) : '0.0';
  const clickRate = totalOpened ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0.0';
  const conversionRate = totalClicked ? ((totalConverted / totalClicked) * 100).toFixed(1) : '0.0';

  const totalRevenue = events.reduce((sum, e) => sum + (e.revenue_generated || 0), 0);

  // Compute Top Campaigns
  const campaignStatsMap = new Map();
  campaigns.forEach(c => {
    campaignStatsMap.set(c.id, { name: c.name, channel: c.channel, revenue: 0, sent: 0, converted: 0 });
  });

  events.forEach(e => {
    if (campaignStatsMap.has(e.campaign_id)) {
      campaignStatsMap.get(e.campaign_id).revenue += (e.revenue_generated || 0);
    }
  });

  logs.forEach(l => {
    if (campaignStatsMap.has(l.campaign_id)) {
      campaignStatsMap.get(l.campaign_id).sent += 1;
      if (l.status === 'Converted') {
        campaignStatsMap.get(l.campaign_id).converted += 1;
      }
    }
  });

  const topCampaigns = Array.from(campaignStatsMap.values())
    .filter(c => c.sent > 0 || c.revenue > 0)
    .map(c => ({
      ...c,
      conversionRate: c.sent > 0 ? ((c.converted / c.sent) * 100).toFixed(1) : '0.0'
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Chart data (from actual logs)
  const numDays = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90;
  const chartData = Array.from({ length: numDays }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - ((numDays - 1) - i));
    const dayStr = d.toISOString().split('T')[0];
    
    const dayLogs = logs.filter((l: any) => l.timestamp && l.timestamp.startsWith(dayStr));
    
    return {
      name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sent: dayLogs.length,
      opened: dayLogs.filter((l: any) => l.status === 'Opened' || l.status === 'Clicked' || l.status === 'Converted').length,
      clicked: dayLogs.filter((l: any) => l.status === 'Clicked' || l.status === 'Converted').length,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics & Reports</h2>
          <p className="text-base text-gray-500 dark:text-gray-400 mt-1">Detailed performance metrics for all your communications.</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={dateRange} 
            onChange={e => setDateRange(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
          <CSVLink 
            data={logs} 
            filename="analytics_report.csv"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 h-10 px-4 py-2 dark:text-white"
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </CSVLink>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <Card className="dark:bg-gray-900 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">📬 Delivery Rate</span>
                <span className="text-4xl font-bold text-gray-900 dark:text-white">{deliveryRate}%</span>
              </div>
              <div className="w-[52px] h-[52px] flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400">
                <Megaphone className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 flex items-center gap-1 font-medium"><TrendingUp className="w-3 h-3"/> +2.4%</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">👀 Open Rate</span>
                <span className="text-4xl font-bold text-gray-900 dark:text-white">{openRate}%</span>
              </div>
              <div className="w-[52px] h-[52px] flex items-center justify-center shrink-0 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-600 dark:text-purple-400">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-3 flex items-center gap-1 font-medium"><TrendingUp className="w-3 h-3"/> +4.1%</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">🖱 Click Rate</span>
                <span className="text-4xl font-bold text-gray-900 dark:text-white">{clickRate}%</span>
              </div>
              <div className="w-[52px] h-[52px] flex items-center justify-center shrink-0 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-600 dark:text-orange-400">
                <Activity className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-3 font-medium">Average across all</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">📈 Conversion Rate</span>
                <span className="text-4xl font-bold text-gray-900 dark:text-white">{conversionRate}%</span>
              </div>
              <div className="w-[52px] h-[52px] flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3 flex items-center gap-1 font-medium"><TrendingUp className="w-3 h-3"/> +1.2%</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">💰 Revenue</span>
                <span className="text-4xl font-bold text-gray-900 dark:text-white">₹{totalRevenue.toLocaleString()}</span>
              </div>
              <div className="w-[52px] h-[52px] flex items-center justify-center shrink-0 bg-green-50 dark:bg-green-900/20 rounded-2xl text-green-600 dark:text-green-400">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-3 flex items-center gap-1 font-medium"><TrendingUp className="w-3 h-3"/> +12.5%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 dark:bg-gray-900 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="dark:text-white">Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'var(--tw-prose-body)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    cursor={{stroke: '#E5E7EB', strokeWidth: 2, opacity: 0.2}}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Line type="monotone" dataKey="sent" stroke="#2563EB" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                  <Line type="monotone" dataKey="opened" stroke="#9333EA" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} />
                  <Line type="monotone" dataKey="clicked" stroke="#F97316" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-white">Top Performing Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4 mt-2">
               {topCampaigns.length === 0 ? (
                 <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No campaign data yet.</div>
               ) : (
                 topCampaigns.map((c, i) => (
                   <div key={i} className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-colors">
                     <div className="flex-1 min-w-0 pr-4">
                       <p className="text-base font-semibold text-gray-900 dark:text-white truncate">{c.name} ({c.channel})</p>
                       <p className="text-sm text-gray-500 dark:text-gray-400">{c.conversionRate}% conv. rate</p>
                     </div>
                     <div className="text-right shrink-0">
                       <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{c.revenue.toLocaleString()}</p>
                     </div>
                   </div>
                 ))
               )}
             </div>
             
             <Button 
               variant="outline" 
               onClick={() => navigate('/campaigns')}
               className="w-full mt-4 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
             >
               View Campaigns
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
