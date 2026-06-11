import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, Phone, Calendar, ShoppingCart, TrendingUp, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    }
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['customer-orders', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').eq('customer_id', id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading customer profile...</div>;
  if (!customer) return <div className="p-8 text-center text-red-500">Customer not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/customers">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Customer Profile</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-3xl mb-4">
                {customer.name.charAt(0)}
              </div>
              <h3 className="text-xl font-bold text-gray-900">{customer.name}</h3>
              <p className="text-sm text-gray-500 mt-1">Customer since {new Date(customer.created_at).toLocaleDateString()}</p>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900">{customer.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900">{customer.phone || 'No phone number'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Intelligence</h4>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-100 dark:border-green-800">
              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Lifetime Value</p>
              <p className="text-lg font-semibold text-green-600">₹{customer.lifetime_value?.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Preferred Channel</p>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                {customer.preferred_channel || 'Email'}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Churn Risk</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                customer.churn_risk === 'High' ? 'bg-red-50 text-red-700' :
                customer.churn_risk === 'Medium' ? 'bg-yellow-50 text-yellow-700' :
                'bg-green-50 text-green-700'
              }`}>
                {customer.churn_risk || 'Low'}
              </span>
            </div>
          </div>
        </div>

        <div className="col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Recent Orders
              </h4>
            </div>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No orders found.</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order: any) => (
                  <div key={order.id} className="flex justify-between items-center p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Order #{order.id.split('-')[0]}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">₹{order.amount.toLocaleString()}</p>
                      <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">{order.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <CustomerCampaignInteractions customerId={id as string} />
        </div>
      </div>
    </div>
  );
}

function CustomerCampaignInteractions({ customerId }: { customerId: string }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['customer-campaign-logs', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_logs')
        .select(`
          id, status, timestamp,
          campaigns ( name, channel )
        `)
        .eq('customer_id', customerId)
        .order('timestamp', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Recent Campaign Interactions
        </h4>
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Loading interactions...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No campaign interactions found.</p>
      ) : (
        <div className="space-y-4">
          {logs.map((log: any) => (
            <div key={log.id} className="flex justify-between items-center p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{log.campaigns?.name || 'Unknown Campaign'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  log.status === 'Converted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  log.status === 'Clicked' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                  log.status === 'Opened' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                  log.status === 'Failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {log.status}
                </span>
                {log.error_message && <p className="text-[10px] text-red-500 mt-1 max-w-[150px] truncate">{log.error_message}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
