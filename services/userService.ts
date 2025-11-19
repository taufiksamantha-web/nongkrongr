
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
    // Note: This function 'delete_user' must be created in your Supabase SQL Editor.
    /* 
       SQL:
       create or replace function delete_user()
       returns void as $$
       begin
         delete from auth.users where id = auth.uid(); -- Or pass ID as argument for admin
       end;
       $$ language plpgsql security definer;
    */
    
    // Try to call a hypothetical admin deletion function first
    const { error: rpcError } = await supabase.rpc('delete_user_by_id', { user_id: userId });
    
    if (!rpcError) {
        return { error: null };
    }

    // 2. Fallback: Delete from 'profiles' table directly.
    // If ON DELETE CASCADE is set up in the DB, this handles app data.
    // Deleting from 'profiles' effectively removes the user from the app logic, 
    // even if the auth record remains orphaned in Supabase Auth (until admin cleans it).
    console.warn("RPC delete failed or not found, falling back to profiles deletion:", rpcError.message);

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
