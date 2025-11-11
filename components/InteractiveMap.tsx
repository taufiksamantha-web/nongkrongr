import React, { useEffect, useRef } from 'react';
import { Cafe } from '../types';
import { optimizeCloudinaryImage } from '../utils/imageOptimizer';

// Mendeklarasikan 'L' dari Leaflet sebagai variabel global untuk memuaskan TypeScript
declare const L: any;

interface InteractiveMapProps {
  cafe?: Cafe;    // Untuk tampilan satu kafe di DetailPage
  cafes?: Cafe[]; // Untuk tampilan banyak kafe di ExplorePage
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ cafe, cafes }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null); // Menyimpan instance peta
  const markersRef = useRef<any[]>([]); // Menyimpan instance marker

  useEffect(() => {
    // Inisialisasi peta hanya sekali saat komponen pertama kali dimuat
    if (mapContainerRef.current && !mapRef.current && typeof L !== 'undefined') {
      const map = L.map(mapContainerRef.current).setView([-2.976, 104.745], 13); // Tampilan default Palembang
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      mapRef.current = map;
    }

    // Fungsi cleanup untuk menghapus instance peta saat komponen di-unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Dependensi kosong memastikan ini hanya berjalan sekali (mount dan unmount)

  useEffect(() => {
    // Efek ini berjalan setiap kali `cafe` atau `cafes` berubah untuk memperbarui marker
    const map = mapRef.current;
    if (!map) return;

    // 1. Hapus semua marker yang ada dari peta dan dari ref
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // 2. Logika untuk menampilkan banyak kafe (Explore Page)
    if (cafes && cafes.length > 0) {
      const bounds = L.latLngBounds();
      cafes.forEach(c => {
        if (c.coords && typeof c.coords.lat === 'number' && typeof c.coords.lng === 'number') {
          // Buat konten popup yang kaya dengan gambar, info, dan tautan
          const popupContent = `
            <div class="font-sans" style="width: 200px;">
              <img src="${optimizeCloudinaryImage(c.coverUrl, 200, 100)}" alt="${c.name}" class="w-full h-24 object-cover rounded-lg mb-2" />
              <h3 class="font-bold font-jakarta text-base text-gray-800">${c.name}</h3>
              <p class="text-gray-600 text-sm mb-2">${c.district}</p>
              <a href="/#/cafe/${c.slug}" class="text-primary font-semibold text-sm hover:underline">Lihat Detail &rarr;</a>
            </div>
          `;

          const marker = L.marker([c.coords.lat, c.coords.lng])
            .addTo(map)
            .bindPopup(popupContent);
          
          markersRef.current.push(marker);
          bounds.extend([c.coords.lat, c.coords.lng]);
        }
      });
      // Sesuaikan tampilan peta agar semua marker terlihat
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    } 
    // 3. Logika untuk menampilkan satu kafe (Detail Page)
    else if (cafe && cafe.coords) {
      const { lat, lng } = cafe.coords;
      const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`<b>${cafe.name}</b>`)
        .openPopup();
      
      markersRef.current.push(marker);
      map.setView([lat, lng], 16); // Set view dengan zoom yang lebih dekat
    }
  }, [cafe, cafes]); // Efek ini dijalankan kembali jika data kafe berubah

  return <div ref={mapContainerRef} className="w-full h-full" />;
};

export default InteractiveMap;
