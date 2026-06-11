import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Search, ShoppingCart, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export default function Orders() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders_with_customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (
            name,
            email,
            preferred_channel
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const filteredOrders = orders.filter((o: any) => 
    o.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = orders.reduce((sum: number, o: any) => sum + Number(o.amount), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Orders</h2>
        <p className="text-base text-gray-500 dark:text-gray-400">Track all customer purchases and transactions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-800">
          <p className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-1">Total Orders</p>
          <div className="flex items-center justify-between">
            <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{orders.length}</h3>
            <div className="w-[52px] h-[52px] flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-800">
          <p className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-1">Total Revenue</p>
          <div className="flex items-center justify-between">
            <h3 className="text-4xl font-bold text-gray-900 dark:text-white">₹{totalRevenue.toLocaleString()}</h3>
            <div className="w-[52px] h-[52px] flex items-center justify-center shrink-0 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-800">
          <p className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-1">Average Order Value</p>
          <div className="flex items-center justify-between">
            <h3 className="text-4xl font-bold text-gray-900 dark:text-white">₹{avgOrderValue.toFixed(2)}</h3>
            <div className="w-[52px] h-[52px] flex items-center justify-center shrink-0 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by customer name, order ID, or status..." 
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
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Channel Hint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">Loading orders...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingCart className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      <p>No orders found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-base font-semibold text-gray-500 dark:text-gray-400">
                      #{order.id.split('-')[0].toUpperCase()}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-lg text-gray-900 dark:text-white">{order.customers?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{order.customers?.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-xl text-gray-900 dark:text-white">₹{order.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-2 text-base font-medium">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                        order.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {order.status === 'Completed' ? '🟢 ' : order.status === 'Pending' ? '🟡 ' : '🔴 '}{order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {order.customers?.preferred_channel || 'Email'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
