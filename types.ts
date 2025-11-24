

export enum NewsStatus {
  HOAX = 'HOAKS',
  FAKTA = 'FAKTA',
  DISINFORMASI = 'DISINFORMASI',
  HATE_SPEECH = 'HATE SPEECH',
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  status: NewsStatus;
  imageUrl: string;
  source?: string;
  tags: string[];
  viewCount?: number; // Added logic view count
  referenceLink?: string; // Changed to single string to match DB column 'reference_link'
}

export interface ReportFormData {
  name: string;
  email: string;
  phone: string;
  content: string;
  category: string;
  evidence?: File | null;
  evidenceUrl?: string; // Added for Cloudinary URL
}

// Renamed from Ticket to TicketData to avoid conflict with Lucide Icons
export interface TicketData {
  id: string;
  reportData: ReportFormData;
  status: 'pending' | 'investigating' | 'verified' | 'rejected';
  submissionDate: string;
  history: { date: string; note: string }[];
}

export interface SearchStat {
  keyword: string;
  count: number;
}

export interface CtaConfig {
  title?: string; // Added title for customization
  description?: string;
  showFormBtn?: boolean;
  showWaBtn?: boolean;
  waNumber?: string;
}

export interface SocialConfig {
  twitter?: string;
  instagram?: string;
  youtube?: string;
}

export interface AppConfig {
  logoUrl?: string;
  secondaryLogoUrl?: string; 
  heroBgUrl?: string;
  heroTitle?: string;
  heroDescription?: string;
  cta?: CtaConfig;
  socials?: SocialConfig;
}