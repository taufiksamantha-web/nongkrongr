
import { SearchStat } from './types';

// --- KONFIGURASI STATIS ---

// Statistik Pencarian Populer (Ini tetap dipertahankan sebagai sugesti UI)
export const MOCK_SEARCH_STATS: SearchStat[] = [
  { keyword: 'Bansos', count: 1500 },
  { keyword: 'Jembatan Ampera', count: 1200 },
  { keyword: 'Pemutihan Pajak', count: 980 },
  { keyword: 'Loker PNS', count: 850 },
  { keyword: 'Jalan Rusak', count: 600 },
  { keyword: 'Begal', count: 450 },
];

// Kategori Laporan
export const CATEGORIES = [
  'Kesehatan',
  'Politik',
  'Bencana Alam',
  'Penipuan Online',
  'Lalulintas',
  'Lainnya'
];
