
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
    // 1. Attempt to use a Secure RPC function (best practice for deleting from auth.users)
    const { error: rpcError } = await supabase.rpc('delete_user_by_id', { user_id: userId });
    
    if (!rpcError) {
        return { error: null };
    }

    console.warn("RPC delete failed or not found, falling back to manual cleanup and profile deletion:", rpcError.message);

    // 2. Manual Cleanup: Set manager_id to NULL for any cafes owned by this user.
    // This prevents Foreign Key constraint errors when deleting the profile.
    const { error: unlinkError } = await supabase
        .from('cafes')
        .update({ manager_id: null })
        .eq('manager_id', userId);

    if (unlinkError) {
        console.error(`Error unlinking cafes for user ${userId}:`, unlinkError);
        // Even if update fails, we might try deleting profile if it's not a FK issue, 
        // but usually it is. We return error here to be safe.
        return { error: unlinkError };
    }

    // 3. Fallback: Delete from 'profiles' table directly.
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
