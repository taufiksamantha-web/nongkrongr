
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

  async getRejectedUsers(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'rejected');
    if (error) {
        console.error("Error fetching rejected users:", error);
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

  async archiveUser(userId: string): Promise<{ error: any }> {
    return this.updateUserStatus(userId, 'archived');
  },

  async restoreUser(userId: string): Promise<{ error: any }> {
    return this.updateUserStatus(userId, 'active');
  },

  async deleteUserPermanent(userId: string): Promise<{ error: any }> {
    // Warning: This relies on ON DELETE CASCADE in the database to remove related data
    // (likes, reviews, etc.) linked to this user.
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
    
    if (error) {
        console.error(`Error deleting user ${userId} permanently:`, error);
    }
    return { error };
  }
};
