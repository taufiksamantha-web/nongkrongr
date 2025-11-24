/**
 * Helper untuk mengoptimalkan gambar, khususnya dari Cloudinary.
 * Menambahkan parameter f_auto (format otomatis), q_auto (kualitas otomatis),
 * dan w_{width} untuk resize.
 */
export const optimizeImage = (url: string, width: number = 800): string => {
  if (!url) return '';
  
  // Cek apakah URL dari Cloudinary
  if (url.includes('cloudinary.com')) {
    // Jika sudah ada parameter optimasi, kembalikan apa adanya untuk menghindari duplikasi
    if (url.includes('f_auto') || url.includes('q_auto')) return url;

    // Insert transformasi setelah "/upload/"
    // Pattern: .../upload/v1234/... -> .../upload/f_auto,q_auto,w_800/v1234/...
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
  }

  // Jika bukan Cloudinary (misal placeholder atau hosting lain), kembalikan aslinya
  return url;
};