import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { logActivity } from '../lib/activity';
import { useAuthStore } from '../store/useAuthStore';

type Customer = {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  preferred_channel?: string;
  churn_risk?: string;
};

type CustomerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
};

export function CustomerModal({ isOpen, onClose, customer }: CustomerModalProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [initialAmount, setInitialAmount] = useState<number>(0);
  const [formData, setFormData] = useState<Customer>({
    name: '',
    email: '',
    phone: '',
    preferred_channel: 'Email',
    churn_risk: 'Low',
  });

  useEffect(() => {
    if (customer) {
      setFormData(customer);
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        preferred_channel: 'Email',
        churn_risk: 'Low',
      });
      setInitialAmount(0);
    }
  }, [customer, isOpen]);

  const saveCustomer = useMutation({
    mutationFn: async (data: Customer) => {
      const { id, ...rest } = data;
      if (id) {
        const { data: result, error } = await supabase.from('customers').update(rest).eq('id', id).select().single();
        if (error) throw error;
        await logActivity('Updated customer', 'Customer', id, { name: rest.name });
        return result;
      } else {
        const payload = { ...rest, user_id: user?.id, lifetime_value: initialAmount > 0 ? initialAmount : 0 };
        const { data: result, error } = await supabase.from('customers').insert([payload]).select().single();
        if (error) throw error;
        
        if (initialAmount > 0) {
          await supabase.from('orders').insert([{
            customer_id: result.id,
            amount: initialAmount,
            status: 'Delivered',
            user_id: user?.id
          }]);
        }
        
        await logActivity('Added new customer', 'Customer', result.id, { name: rest.name });
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onClose();
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-lg">
        <h3 className="text-xl font-bold mb-4 dark:text-white">
          {customer ? 'Edit Customer' : 'Add New Customer'}
        </h3>
        
        <form onSubmit={(e) => { e.preventDefault(); saveCustomer.mutate(formData); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input 
              type="text" 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent dark:text-white" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input 
              type="email" 
              required 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent dark:text-white" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone (Optional)</label>
            <input 
              type="tel" 
              value={formData.phone || ''} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent dark:text-white" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preferred Channel</label>
              <select 
                value={formData.preferred_channel} 
                onChange={e => setFormData({...formData, preferred_channel: e.target.value})} 
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent dark:text-white"
              >
                <option>Email</option>
                <option>WhatsApp</option>
                <option>SMS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Churn Risk</label>
              <select 
                value={formData.churn_risk} 
                onChange={e => setFormData({...formData, churn_risk: e.target.value})} 
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent dark:text-white"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>
          
          {!customer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Initial Order Amount (Optional)</label>
              <input 
                type="number" 
                min="0"
                value={initialAmount || ''} 
                onChange={e => setInitialAmount(Number(e.target.value))} 
                placeholder="e.g. 500"
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent dark:text-white" 
              />
              <p className="text-xs text-gray-500 mt-1">This will automatically create their first order and set their lifetime value.</p>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 text-white" disabled={saveCustomer.isPending}>
              {saveCustomer.isPending ? 'Saving...' : 'Save Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
