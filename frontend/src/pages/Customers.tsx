import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Search, Filter, Download, Edit, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CSVLink } from 'react-csv';
import { CustomerModal } from '../components/CustomerModal';
import { useAuthStore } from '../store/useAuthStore';

export default function Customers() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [filterChannel, setFilterChannel] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('user_id', user?.id);
      if (error) throw error;
      return data;
    }
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      if (window.confirm('Are you sure you want to delete this customer?')) {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });

  // Filter and sort logic
  const filteredCustomers = customers.filter(c => 
    (c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     c.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterChannel ? c.preferred_channel === filterChannel : true)
  ).sort((a: any, b: any) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const headers = [
    { label: 'Name', key: 'name' },
    { label: 'Email', key: 'email' },
    { label: 'Phone', key: 'phone' },
    { label: 'Total Spend', key: 'total_spend' },
    { label: 'LTV', key: 'lifetime_value' },
    { label: 'Channel', key: 'preferred_channel' },
    { label: 'Churn Risk', key: 'churn_risk' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Customers</h2>
          <p className="text-base text-gray-500 mt-1">Manage your customer database and intelligence.</p>
        </div>
        <div className="flex gap-3">
          <CSVLink 
            data={filteredCustomers} 
            headers={headers} 
            filename="customers.csv"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800"
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </CSVLink>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }}
          >
            Add Customer
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-transparent dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              value={filterChannel || ''}
              onChange={(e) => setFilterChannel(e.target.value || null)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent dark:text-white"
            >
              <option value="">All Channels</option>
              <option value="Email">Email</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-base text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-base font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('name')}>Customer Name</th>
                <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('lifetime_value')}>Total Spend</th>
                <th className="px-4 py-3">Preferred Channel</th>
                <th className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('churn_risk')}>Churn Risk</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Loading customers...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No customers found.</td></tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                          {customer.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-lg text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{customer.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-xl text-gray-900 dark:text-white">₹{customer.lifetime_value?.toLocaleString() || 0}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        {customer.preferred_channel || 'Email'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                        customer.churn_risk === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        customer.churn_risk === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {customer.churn_risk || 'Low'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={`/customers/${customer.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-indigo-600">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-500 hover:text-blue-600"
                          onClick={() => { setEditingCustomer(customer); setIsModalOpen(true); }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600" onClick={() => deleteCustomer.mutate(customer.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        customer={editingCustomer} 
      />
    </div>
  );
}
