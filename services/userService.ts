import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types';

export const userService = {
  async getPendingApprovalUsers(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending_approval');
    if (error) {
        console.error("Error fetching pending users:", error);
        throw error;
    }
    return data as Profile[];
  },

  async getAllUsers(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    if (error) {
        console.error("Error fetching all users:", error);
        throw error;
    }
    return data as Profile[];
  },
  
  async updateUserStatus(userId: string, status: Profile['status']): Promise<{ error: any }> {
    const { error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', userId);
    
    if (error) {
        console.error(`Error updating status for user ${userId}:`, error);
    }
    return { error };
  },
};