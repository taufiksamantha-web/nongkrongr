
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
    // 1. Unlink cafes FIRST to prevent Foreign Key constraint errors on the 'cafes' table
    const { error: unlinkManagerError } = await supabase
        .from('cafes')
        .update({ manager_id: null })
        .eq('manager_id', userId);

    if (unlinkManagerError) {
        console.error(`Error unlinking cafes (manager) for user ${userId}:`, unlinkManagerError);
        return { error: unlinkManagerError };
    }

    const { error: unlinkCreatorError } = await supabase
        .from('cafes')
        .update({ created_by: null })
        .eq('created_by', userId);
        
    if (unlinkCreatorError) {
         console.warn(`Error unlinking cafes (creator) for user ${userId}:`, unlinkCreatorError);
    }

    // 2. Attempt to use Secure RPC function (Recommended)
    // This tries to delete from auth.users.
    try {
        const { error } = await supabase.rpc('delete_user_by_id', { user_id: userId });
        
        if (error) {
            // Check specifically for the Foreign Key violation error (Code 23503)
            if (error.code === '23503' || error.message?.includes('violates foreign key constraint')) {
                return { 
                    error: { 
                        message: "Gagal menghapus: Constraint Database belum dikonfigurasi. Harap jalankan perintah SQL 'ALTER TABLE profiles ... ON DELETE CASCADE' di Supabase Editor." 
                    } 
                };
            }

            console.warn("RPC 'delete_user_by_id' failed. Falling back to manual profile deletion.", error);
            // If RPC fails for other reasons (e.g. function missing), we fall through to manual deletion below
        } else {
            // Success
            return { error: null };
        }
    } catch (e) {
        console.warn("RPC call exception:", e);
    }

    // 3. Fallback: Delete from 'profiles' table directly.
    // This is useful if the RPC function is missing entirely.
    // Note: This ONLY deletes the profile data (app level), not the login credentials (auth level).
    try {
        const { error: manualDeleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
        
        if (manualDeleteError) {
            return { 
                error: { 
                    message: manualDeleteError.message || "Gagal menghapus profil secara manual.",
                    details: manualDeleteError 
                } 
            };
        }
        
        return { error: null };

    } catch (e: any) {
        const errorMessage = e?.message || "Terjadi kesalahan tidak terduga saat menghapus profil.";
        return { error: { message: errorMessage } };
    }
  }
};
