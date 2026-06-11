import { supabase } from './supabase';

export const logActivity = async (
  action: string,
  entity_type: 'Customer' | 'Campaign' | 'AI' | 'System',
  entity_id?: string,
  details?: Record<string, any>
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase.from('activity_logs').insert([{
      user_id: session.user.id,
      action,
      entity_type,
      entity_id,
      details
    }]);

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Failed to log activity exception:', err);
  }
};
