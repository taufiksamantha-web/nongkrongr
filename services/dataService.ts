

import { supabase } from './supabaseClient';
import { NewsItem, TicketData, NewsStatus, AppConfig } from '../types';

// --- NEWS SERVICES ---

export const fetchAllNews = async (): Promise<NewsItem[]> => {
  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching news:', error);
      return []; // Return kosong jika error, jangan pakai mock data
    }
    
    // Mapping database fields to TS Interface
    return data.map((item: any) => {
        // Handle legacy data where reference_links might be an array, convert to newline separated string
        let refString = '';
        if (item.reference_links && Array.isArray(item.reference_links)) {
            refString = item.reference_links.join('\n');
        } else if (item.reference_link) {
            refString = item.reference_link;
        }

        return {
          id: item.id,
          title: item.title,
          content: item.content,
          date: item.date,
          status: item.status as NewsStatus,
          imageUrl: item.image_url,
          source: item.source,
          tags: item.tags || [],
          viewCount: item.view_count,
          referenceLink: refString
        };
    });
  } catch (err) {
    console.error("Supabase connection error");
    return [];
  }
};

export const incrementNewsView = async (id: string) => {
    // First get current view count
    const { data } = await supabase.from('news').select('view_count').eq('id', id).single();
    if (data) {
        await supabase.from('news').update({ view_count: (data.view_count || 0) + 1 }).eq('id', id);
    }
};

export const createNews = async (news: NewsItem) => {
    const payload = {
        id: news.id,
        title: news.title,
        content: news.content,
        date: news.date,
        status: news.status,
        image_url: news.imageUrl,
        source: news.source,
        tags: news.tags,
        view_count: news.viewCount,
        reference_link: news.referenceLink // Save as single string to 'reference_link' column
    };
    const { error } = await supabase.from('news').insert([payload]);
    if (error) throw error;
};

export const updateNews = async (news: NewsItem) => {
    const payload = {
        title: news.title,
        content: news.content,
        date: news.date,
        status: news.status,
        image_url: news.imageUrl,
        source: news.source,
        tags: news.tags,
        reference_link: news.referenceLink // Save as single string
    };
    const { error } = await supabase.from('news').update(payload).eq('id', news.id);
    if (error) throw error;
};

export const deleteNews = async (id: string) => {
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (error) throw error;
};


// --- TICKET SERVICES ---

export const fetchAllTickets = async (): Promise<TicketData[]> => {
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('submission_date', { ascending: false });
            
        if (error) return [];

        return data.map((item: any) => ({
            id: item.id,
            reportData: item.report_data,
            status: item.status,
            submissionDate: item.submission_date,
            history: item.history || []
        }));
    } catch (err) {
        return [];
    }
};

export const createTicket = async (ticket: TicketData) => {
    const payload = {
        id: ticket.id,
        report_data: ticket.reportData,
        status: ticket.status,
        submission_date: ticket.submissionDate,
        history: ticket.history
    };
    const { error } = await supabase.from('tickets').insert([payload]);
    if (error) throw error;
};

export const updateTicketStatus = async (id: string, status: string, history: any[]) => {
    const { error } = await supabase.from('tickets').update({ status, history }).eq('id', id);
    if (error) throw error;
};

export const deleteTicket = async (id: string) => {
     const { error } = await supabase.from('tickets').delete().eq('id', id);
     if (error) throw error;
};

// --- APP SETTINGS SERVICES ---

export const fetchSiteSettings = async (): Promise<AppConfig | null> => {
    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('*')
            .eq('id', 1)
            .single();
            
        if (error || !data) return null;

        return {
            heroTitle: data.hero_title,
            heroDescription: data.hero_description,
            heroBgUrl: data.hero_bg_url,
            logoUrl: data.logo_url,
            secondaryLogoUrl: data.secondary_logo_url,
            cta: data.cta_config,
            socials: data.socials_config
        };
    } catch (err) {
        console.error("Failed to load settings", err);
        return null;
    }
};

export const updateSiteSettings = async (config: AppConfig) => {
    const payload = {
        hero_title: config.heroTitle,
        hero_description: config.heroDescription,
        hero_bg_url: config.heroBgUrl,
        logo_url: config.logoUrl,
        secondary_logo_url: config.secondaryLogoUrl,
        cta_config: config.cta,
        socials_config: config.socials,
        updated_at: new Date()
    };

    // Upsert ensures we update ID 1 or create it if missing
    const { error } = await supabase.from('site_settings').upsert({ id: 1, ...payload });
    if (error) throw error;
};

// --- VISITOR STATS ---
export const incrementVisitorCount = async (): Promise<number> => {
    const sessionKey = 'scf_session_visited';
    const hasVisited = sessionStorage.getItem(sessionKey);
    
    try {
        // 1. Coba ambil data dari DB
        const { data, error } = await supabase
            .from('site_settings')
            .select('visitor_count')
            .eq('id', 1)
            .single();

        if (error || !data) {
            throw new Error("DB Visitor count not setup");
        }

        let currentCount = data.visitor_count || 0;

        // 2. LOGIKA SESSION:
        // Jika user belum punya 'tiket' sesi, berarti dia pengunjung baru (atau baru buka browser)
        if (!hasVisited) {
            currentCount = currentCount + 1;
            
            // Update DB
            await supabase
                .from('site_settings')
                .update({ visitor_count: currentCount })
                .eq('id', 1);
            
            // Beri tiket ke user agar refresh berikutnya tidak dihitung
            sessionStorage.setItem(sessionKey, 'true');
        }

        return currentCount;

    } catch (err) {
        // Fallback Logic: Simulate persistent count using LocalStorage
        // Jika DB mati/error, kita pakai localStorage
        const storageKey = 'scf_total_visitors';
        const lastCount = parseInt(localStorage.getItem(storageKey) || '15420'); 
        
        if (!hasVisited) {
             const newCount = lastCount + 1;
             localStorage.setItem(storageKey, newCount.toString());
             sessionStorage.setItem(sessionKey, 'true');
             return newCount;
        }
        
        return lastCount;
    }
};
