import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Megaphone, Activity, DollarSign, ArrowUpRight, ArrowDownRight, Clock, UserPlus, ShoppingCart, Bot, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';

import { useAuthStore } from '../store/useAuthStore';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { data: metrics } = useQuery({
    queryKey: ['dashboard_metrics'],
    queryFn: async () => {
      const [
        { count: totalCustomers },
        { count: activeCampaigns },
        { data: events },
        { data: logs },
        { count: totalOrders, data: totalOrdersData }
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'Running').eq('user_id', user?.id),
        supabase.from('campaign_events').select('revenue_generated, created_at').eq('user_id', user?.id),
        supabase.from('communication_logs').select('status').eq('user_id', user?.id),
        supabase.from('orders').select('amount', { count: 'exact' }).eq('user_id', user?.id)
      ]);

      const totalRevenue = totalOrdersData?.reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0) || 0;
      
      const totalSent = logs?.length || 0;
      const totalConverted = logs?.filter(l => l.status === 'Converted').length || 0;
      const conversionRate = totalSent ? ((totalConverted / totalSent) * 100).toFixed(1) : '0.0';

      return {
        totalCustomers: totalCustomers || 0,
        activeCampaigns: activeCampaigns || 0,
        totalOrders: totalOrders || 0,
        totalRevenue,
        conversionRate,
        events: events || []
      };
    }
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['recent_activity'],
    queryFn: async () => {
      const { data, error } = await supabase.from('activity_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  // Calculate simple chart data from real events for the past 7 days
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().split('T')[0];
    
    const dayRevenue = metrics?.events
      ?.filter(e => e.created_at.startsWith(dayStr))
      ?.reduce((sum, e) => sum + (e.revenue_generated || 0), 0) || 0;

    return {
      name: d.toLocaleDateString('en-US', { weekday: 'short' }),
      revenue: dayRevenue
    };
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ['recent_orders_dashboard'],
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('*, customers(name)').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(5);
      return data || [];
    }
  });

  const { data: topCustomers = [] } = useQuery({
    queryKey: ['top_customers_dashboard'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*').eq('user_id', user?.id).order('lifetime_value', { ascending: false }).limit(5);
      return data || [];
    }
  });

  const { data: recentCampaigns = [] } = useQuery({
    queryKey: ['recent_campaigns_dashboard'],
    queryFn: async () => {
      const { data } = await supabase.from('campaigns').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(5);
      return data || [];
    }
  });

  const getActivityIcon = (action: string) => {
    if (action.includes('Added customer') || action.includes('Customer Added')) return <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    if (action.includes('Created order') || action.includes('Order Created')) return <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    if (action.includes('AI Campaign Generated')) return <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    if (action.includes('Created campaign') || action.includes('Campaign Created')) return <Megaphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    if (action.includes('Paused')) return <PauseCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
    if (action.includes('Resumed')) return <PlayCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    if (action.includes('Deleted')) return <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />;
    return <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
  };

  const getActivityBg = (action: string) => {
    if (action.includes('Added') || action.includes('Resumed')) return 'bg-emerald-50 dark:bg-emerald-900/20';
    if (action.includes('Order')) return 'bg-blue-50 dark:bg-blue-900/20';
    if (action.includes('AI')) return 'bg-purple-50 dark:bg-purple-900/20';
    if (action.includes('Paused') || action.includes('Deleted')) return 'bg-orange-50 dark:bg-orange-900/20';
    return 'bg-indigo-50 dark:bg-indigo-900/20';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Workspace Overview</h2>
        <p className="text-base text-gray-500 dark:text-gray-400">Here's what's happening with your campaigns today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        <Card className="dark:bg-gray-900 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">👥 Total Customers</span>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{metrics?.totalCustomers.toLocaleString() || '...'}</span>
              </div>
              <div className="w-[52px] h-[52px] flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-3 flex items-center gap-1 font-medium"><ArrowUpRight className="w-3 h-3"/> Active DB size</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">📦 Orders</span>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{metrics?.totalOrders.toLocaleString() || '...'}</span>
              </div>
              <div className="w-[52px] h-[52px] flex items-center justify-center shrink-0 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                <ShoppingCart className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-3 flex items-center gap-1 font-medium"><ArrowUpRight className="w-3 h-3"/> Total processed</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">📢 Active Campaigns</span>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{metrics?.activeCampaigns || '...'}</span>
              </div>
              <div className="w-[52px] h-[52px] flex items-center justify-center shrink-0 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
                <Megaphone className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-1 font-medium">Running or Scheduled</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">📈 Conversion Rate</span>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{metrics?.conversionRate || '...'}%</span>
              </div>
              <div className="w-[52px] h-[52px] flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                <Activity className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-3 flex items-center gap-1 font-medium"><ArrowUpRight className="w-3 h-3"/> Across all logs</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1.5">💰 Revenue</span>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">₹{metrics?.totalRevenue.toLocaleString() || '0'}</span>
              </div>
              <div className="w-[52px] h-[52px] flex items-center justify-center shrink-0 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-1 font-medium">Lifetime total</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="dark:bg-gray-900 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="dark:text-white">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: 'var(--tw-prose-body)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    cursor={{fill: '#F3F4F6', opacity: 0.2}}
                  />
                  <Bar dataKey="revenue" fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="dark:text-white flex items-center gap-2">⚡ Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                   <Activity className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                   No recent activity.
                </div>
              ) : (
                activities.map(activity => (
                  <div key={activity.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 ${getActivityBg(activity.action)}`}>
                      {getActivityIcon(activity.action)}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {activity.action}
                        {activity.details?.name && <span className="font-semibold text-indigo-600 dark:text-indigo-400 ml-1">"{activity.details.name}"</span>}
                        {activity.details?.amount && <span className="font-semibold text-emerald-600 dark:text-emerald-400 ml-1">₹{activity.details.amount}</span>}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-white">Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCustomers.length === 0 ? <p className="text-sm text-gray-500">No customers yet.</p> :
                topCustomers.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-base dark:text-white">{c.name}</p>
                        <p className="text-sm text-gray-500">{c.email}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xl font-bold text-green-600">₹{c.lifetime_value?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-white">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length === 0 ? <p className="text-sm text-gray-500">No orders yet.</p> :
                recentOrders.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-base dark:text-white">#{o.id.split('-')[0].toUpperCase()}</p>
                      <p className="text-sm text-gray-500">{o.customers?.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xl font-bold dark:text-white">₹{o.amount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-white">Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCampaigns.length === 0 ? <p className="text-sm text-gray-500">No campaigns yet.</p> :
                recentCampaigns.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-base dark:text-white">{c.name}</p>
                      <p className="text-sm text-gray-500">{c.channel}</p>
                    </div>
                    <span className={`text-sm px-3 py-1 font-medium rounded-full ${
                      c.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                      c.status === 'Running' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{c.status}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
