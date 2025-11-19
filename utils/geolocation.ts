
/**
 * Menghitung jarak antara dua titik koordinat geografis menggunakan formula Haversine.
 * @param lat1 Latitude titik pertama.
 * @param lon1 Longitude titik pertama.
 * @param lat2 Latitude titik kedua.
 * @param lon2 Longitude titik kedua.
 * @returns Jarak dalam kilometer (Garis Lurus).
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius Bumi dalam km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Jarak dalam km
    return distance;
}

/**
 * Menghitung jarak tempuh berkendara (Driving Distance) menggunakan OSRM API.
 * @param start Lokasi awal {lat, lng}
 * @param end Lokasi tujuan {lat, lng}
 * @returns Promise jarak dalam kilometer, atau null jika gagal.
 */
export async function getDrivingDistance(start: {lat: number, lng: number}, end: {lat: number, lng: number}): Promise<number | null> {
    try {
        // Menggunakan layanan publik OSRM (Demo Server)
        // Catatan: Dalam produksi, sebaiknya gunakan server sendiri atau API berbayar untuk menghindari rate limit.
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false`);
        
        if (!response.ok) return null;
        
        const data = await response.json();
        
        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
            // OSRM mengembalikan jarak dalam meter, kita konversi ke km
            return data.routes[0].distance / 1000;
        }
        return null;
    } catch (error) {
        console.error("Error fetching driving distance:", error);
        return null;
    }
}
