import { Cafe, Amenity, Vibe, PriceTier, Review, User } from './types';

export const AMENITIES: Amenity[] = [
  { id: 'wifi', name: 'WiFi Cepat', icon: '📶' },
  { id: 'power', name: 'Stop Kontak', icon: '🔌' },
  { id: 'ac', name: 'AC Dingin', icon: '❄️' },
  { id: 'outdoor', name: 'Outdoor Area', icon: '🌳' },
  { id: 'indoor', name: 'Indoor Area', icon: '🏠' },
  { id: 'musholla', name: 'Musholla', icon: '🕌' },
  { id: 'parking', name: 'Parkir Luas', icon: '🅿️' },
];

export const VIBES: Vibe[] = [
  { id: 'cozy', name: 'Cozy' },
  { id: 'minimalis', name: 'Minimalis' },
  { id: 'industrial', name: 'Industrial' },
  { id: 'tropical', name: 'Tropical' },
  { id: 'classic', name: 'Klasik' },
];

export const DISTRICTS: string[] = [
    "Ilir Timur I", "Ilir Timur II", "Ilir Timur III", "Ilir Barat I", "Ilir Barat II",
    "Sukarami", "Sako", "Sematang Borang", "Alang-Alang Lebar", "Kemuning", "Kalidoni",
    "Bukit Kecil", "Kertapati", "Plaju", "Seberang Ulu I", "Seberang Ulu II", "Jakabaring", "Gandus"
];

export const MOCK_USERS: User[] = [
    { id: 'u1', username: 'admin', password: '12345', role: 'admin' },
    { id: 'u2', username: 'user1', password: 'password', role: 'user' },
    { id: 'u3', username: 'user2', password: 'password', role: 'user' },
];

const calculateAverages = (reviews: Review[]) => {
    const approvedReviews = reviews.filter(r => r.status === 'approved');
    if (approvedReviews.length === 0) return { avgAestheticScore: 0, avgWorkScore: 0, avgCrowdMorning: 0, avgCrowdAfternoon: 0, avgCrowdEvening: 0 };
    const totalAesthetic = approvedReviews.reduce((sum, r) => sum + r.ratingAesthetic, 0);
    const totalWork = approvedReviews.reduce((sum, r) => sum + r.ratingWork, 0);
    const totalCrowdMorning = approvedReviews.reduce((sum, r) => sum + r.crowdMorning, 0);
    const totalCrowdAfternoon = approvedReviews.reduce((sum, r) => sum + r.crowdAfternoon, 0);
    const totalCrowdEvening = approvedReviews.reduce((sum, r) => sum + r.crowdEvening, 0);
    return {
        avgAestheticScore: parseFloat((totalAesthetic / approvedReviews.length).toFixed(1)),
        avgWorkScore: parseFloat((totalWork / approvedReviews.length).toFixed(1)),
        avgCrowdMorning: parseFloat((totalCrowdMorning / approvedReviews.length).toFixed(1)),
        avgCrowdAfternoon: parseFloat((totalCrowdAfternoon / approvedReviews.length).toFixed(1)),
        avgCrowdEvening: parseFloat((totalCrowdEvening / approvedReviews.length).toFixed(1)),
    };
};

const initialReviews1: Review[] = [
    { id: 'r1', author: 'Caca', ratingAesthetic: 9, ratingWork: 8, crowdMorning: 2, crowdAfternoon: 3, crowdEvening: 4, priceSpent: 50000, text: 'Tempatnya super aesthetic, cocok banget buat foto-foto. Nugas juga enak!', photos: ['https://picsum.photos/400/300?random=11'], createdAt: new Date(), status: 'approved' },
    { id: 'r2', author: 'Budi', ratingAesthetic: 8, ratingWork: 9, crowdMorning: 1, crowdAfternoon: 2, crowdEvening: 3, priceSpent: 75000, text: 'WiFi kenceng, colokan banyak. Pilihan kopi mantap.', photos: [], createdAt: new Date(), status: 'approved' },
];
const initialReviews2: Review[] = [
    { id: 'r3', author: 'Dina', ratingAesthetic: 10, ratingWork: 7, crowdMorning: 3, crowdAfternoon: 4, crowdEvening: 5, priceSpent: 60000, text: 'Minimalis dan bersih, suka banget sama suasananya. Tapi agak rame pas malem minggu.', photos: ['https://picsum.photos/400/300?random=12'], createdAt: new Date(), status: 'approved' },
];
const initialReviews3: Review[] = [
    { id: 'r4', author: 'Eko', ratingAesthetic: 8, ratingWork: 8, crowdMorning: 2, crowdAfternoon: 3, crowdEvening: 3, priceSpent: 45000, text: 'Industrial vibes-nya dapet banget. Kopi susu gula arennya a must try!', photos: [], createdAt: new Date(), status: 'pending' },
];
const initialReviews5: Review[] = [
    { id: 'r5', author: 'Fara', ratingAesthetic: 9, ratingWork: 7, crowdMorning: 2, crowdAfternoon: 3, crowdEvening: 4, priceSpent: 55000, text: 'Cozy parah, betah lama-lama di sini. Playlist lagunya juga enak.', photos: [], createdAt: new Date(), status: 'approved' },
    { id: 'r6', author: 'Gilang', ratingAesthetic: 8, ratingWork: 8, crowdMorning: 1, crowdAfternoon: 2, crowdEvening: 3, priceSpent: 60000, text: 'Kopinya enak, baristanya ramah. Good place to work.', photos: ['https://picsum.photos/400/300?random=13'], createdAt: new Date(), status: 'approved' },
];
const initialReviews6: Review[] = [
    { id: 'r7', author: 'Hana', ratingAesthetic: 7, ratingWork: 9, crowdMorning: 3, crowdAfternoon: 4, crowdEvening: 5, priceSpent: 40000, text: 'Tempatnya luas, cocok buat nongkrong ramean. Tapi agak berisik kalau mau nugas.', photos: [], createdAt: new Date(), status: 'approved' },
];
const initialReviews7: Review[] = [
    { id: 'r8', author: 'Indra', ratingAesthetic: 10, ratingWork: 8, crowdMorning: 2, crowdAfternoon: 2, crowdEvening: 3, priceSpent: 80000, text: 'Vibesnya klasik dan menenangkan. Suka banget sama interiornya.', photos: ['https://picsum.photos/400/300?random=14'], createdAt: new Date(), status: 'approved' },
];
const initialReviews8: Review[] = [
    { id: 'r9', author: 'Joko', ratingAesthetic: 9, ratingWork: 10, crowdMorning: 1, crowdAfternoon: 1, crowdEvening: 2, priceSpent: 70000, text: 'Sesuai namanya, ini tempat terbaik buat baca buku sambil ngopi. Tenang banget!', photos: [], createdAt: new Date(), status: 'approved' },
    { id: 'r10', author: 'Kiki', ratingAesthetic: 8, ratingWork: 9, crowdMorning: 1, crowdAfternoon: 2, crowdEvening: 2, priceSpent: 65000, text: 'Banyak koleksi buku yang bisa dibaca. WiFi kenceng, a perfect place for writers.', photos: [], createdAt: new Date(), status: 'approved' },
];
const initialReviews9: Review[] = [
    { id: 'r11', author: 'Lina', ratingAesthetic: 8, ratingWork: 7, crowdMorning: 3, crowdAfternoon: 4, crowdEvening: 4, priceSpent: 50000, text: 'Unik konsepnya, industrial tapi tetep nyaman.', photos: [], createdAt: new Date(), status: 'pending' },
];
const initialReviews10: Review[] = [
    { id: 'r12', author: 'Mira', ratingAesthetic: 9, ratingWork: 8, crowdMorning: 2, crowdAfternoon: 3, crowdEvening: 5, priceSpent: 58000, text: 'Asik buat nongkrong sore, view-nya bagus. Makin malem makin rame.', photos: ['https://picsum.photos/400/300?random=15'], createdAt: new Date(), status: 'approved' },
];
const initialReviews11: Review[] = [
    { id: 'r13', author: 'Nana', ratingAesthetic: 7, ratingWork: 6, crowdMorning: 4, crowdAfternoon: 4, crowdEvening: 4, priceSpent: 35000, text: 'Kopi Tiam beneran, harganya terjangkau. Roti bakarnya enak!', photos: [], createdAt: new Date(), status: 'approved' },
];
const initialReviews12: Review[] = [
    { id: 'r14', author: 'Omar', ratingAesthetic: 10, ratingWork: 7, crowdMorning: 2, crowdAfternoon: 3, crowdEvening: 3, priceSpent: 90000, text: 'Surga tropis di tengah kota. Cantik banget setiap sudutnya!', photos: ['https://picsum.photos/400/300?random=16'], createdAt: new Date(), status: 'approved' },
];
const initialReviews13: Review[] = [
    { id: 'r15', author: 'Putra', ratingAesthetic: 8, ratingWork: 8, crowdMorning: 2, crowdAfternoon: 3, crowdEvening: 4, priceSpent: 48000, text: 'Raw and cool! The industrial design is on point.', photos: [], createdAt: new Date(), status: 'approved' },
];
const initialReviews14: Review[] = [
    { id: 'r16', author: 'Qori', ratingAesthetic: 7, ratingWork: 9, crowdMorning: 1, crowdAfternoon: 2, crowdEvening: 3, priceSpent: 25000, text: 'Harga mahasiswa, fasilitas oke. Andalan buat nugas hemat.', photos: [], createdAt: new Date(), status: 'approved' },
];
const initialReviews15: Review[] = [
    { id: 'r17', author: 'Rina', ratingAesthetic: 9, ratingWork: 8, crowdMorning: 3, crowdAfternoon: 3, crowdEvening: 3, priceSpent: 100000, text: 'Serasa di rumah nenek, tapi versi mewah. The glass house is stunning!', photos: ['https://picsum.photos/400/300?random=17'], createdAt: new Date(), status: 'approved' },
];
const initialReviews16: Review[] = [
    { id: 'r18', author: 'Sari', ratingAesthetic: 6, ratingWork: 10, crowdMorning: 1, crowdAfternoon: 2, crowdEvening: 2, priceSpent: 20000, text: 'Jangan harap aesthetic, tapi kalau mau fokus nugas 100%, di sinilah tempatnya. Colokan di mana-mana.', photos: [], createdAt: new Date(), status: 'approved' },
];
const initialReviews17: Review[] = [
    { id: 'r19', author: 'Toni', ratingAesthetic: 8, ratingWork: 7, crowdMorning: 2, crowdAfternoon: 3, crowdEvening: 3, priceSpent: 52000, text: 'Tempat ngopi pagi yang syahdu. Kopi hitamnya mantap.', photos: [], createdAt: new Date(), status: 'approved' },
];
const initialReviews18: Review[] = [
    { id: 'r20', author: 'Uli', ratingAesthetic: 9, ratingWork: 7, crowdMorning: 2, crowdAfternoon: 4, crowdEvening: 4, priceSpent: 62000, text: 'Feels like Bali! Banyak tanaman hijau, seger banget liatnya.', photos: ['https://picsum.photos/400/300?random=18'], createdAt: new Date(), status: 'approved' },
];
const initialReviews19: Review[] = [
    { id: 'r21', author: 'Vino', ratingAesthetic: 8, ratingWork: 9, crowdMorning: 1, crowdAfternoon: 2, crowdEvening: 3, priceSpent: 55000, text: 'Clean, modern, and perfect for working on a laptop. Very fast wifi.', photos: [], createdAt: new Date(), status: 'approved' },
];
const initialReviews20: Review[] = [
    { id: 'r22', author: 'Wulan', ratingAesthetic: 10, ratingWork: 8, crowdMorning: 3, crowdAfternoon: 4, crowdEvening: 5, priceSpent: 120000, text: 'Rooftop-nya the best! Pemandangan kota Palembang malam hari keren banget dari sini. Harganya premium tapi worth it.', photos: ['https://picsum.photos/400/300?random=19'], createdAt: new Date(), status: 'approved' },
    { id: 'r23', author: 'Yudi', ratingAesthetic: 9, ratingWork: 7, crowdMorning: 3, crowdAfternoon: 5, crowdEvening: 5, priceSpent: 150000, text: 'Tempat nge-date paling oke. Romantis dan mewah.', photos: [], createdAt: new Date(), status: 'approved' },
];


export const MOCK_CAFES: Cafe[] = [
  {
    id: '1',
    slug: 'senja-kopi',
    name: 'Senja Kopi',
    address: 'Jl. Jenderal Sudirman No. 123, Palembang',
    district: 'Ilir Timur I',
    openingHours: '08:00 - 22:00',
    priceTier: PriceTier.STANDARD,
    coords: { lat: -2.976073, lng: 104.775430 },
    isSponsored: true,
    sponsoredUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    sponsoredRank: 1,
    logoUrl: 'https://picsum.photos/200/200?random=101',
    coverUrl: 'https://picsum.photos/800/600?random=1',
    vibes: [VIBES[0], VIBES[3]], // Cozy, Tropical
    amenities: [AMENITIES[0], AMENITIES[1], AMENITIES[2], AMENITIES[3]],
    spots: [
        { id: 's1', title: 'Ayunan Taman Belakang', tip: 'Datang sore hari untuk golden hour terbaik!', photoUrl: 'https://picsum.photos/600/400?random=2' },
        { id: 's2', title: 'Dinding Mural', tip: 'OOTD di sini auto keren, pakai outfit warna kontras.', photoUrl: 'https://picsum.photos/600/400?random=3' }
    ],
    reviews: initialReviews1,
    ...calculateAverages(initialReviews1)
  },
  {
    id: '2',
    slug: 'ruang-temu',
    name: 'Ruang Temu',
    address: 'Jl. Rajawali No. 45, Palembang',
    district: 'Ilir Timur II',
    openingHours: '10:00 - 23:00',
    priceTier: PriceTier.STANDARD,
    coords: { lat: -2.960000, lng: 104.758888 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    coverUrl: 'https://picsum.photos/800/600?random=4',
    vibes: [VIBES[1]], // Minimalis
    amenities: [AMENITIES[0], AMENITIES[1], AMENITIES[2], AMENITIES[4]],
    spots: [
        { id: 's3', title: 'Jendela Besar Depan', tip: 'Cahaya alami bagus banget buat foto flatlay kopi.', photoUrl: 'https://picsum.photos/600/400?random=5' }
    ],
    reviews: initialReviews2,
    ...calculateAverages(initialReviews2)
  },
  {
    id: '3',
    slug: 'pabrik-kata',
    name: 'Pabrik Kata',
    address: 'Jl. Demang Lebar Daun No. 67, Palembang',
    district: 'Ilir Barat I',
    openingHours: '09:00 - 21:00',
    priceTier: PriceTier.BUDGET,
    coords: { lat: -2.980000, lng: 104.730000 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    logoUrl: 'https://picsum.photos/200/200?random=103',
    coverUrl: 'https://picsum.photos/800/600?random=6',
    vibes: [VIBES[2]], // Industrial
    amenities: [AMENITIES[0], AMENITIES[1], AMENITIES[3], AMENITIES[6]],
    spots: [
        { id: 's4', title: 'Spot Tangga Besi', tip: 'Gunakan angle dari bawah untuk foto yang dramatis.', photoUrl: 'https://picsum.photos/600/400?random=7' }
    ],
    reviews: initialReviews3,
    ...calculateAverages(initialReviews3)
  },
  {
    id: '4',
    slug: 'griya-teduh',
    name: 'Griya Teduh',
    address: 'Jl. Srijaya Negara, Bukit Lama, Palembang',
    district: 'Bukit Kecil',
    openingHours: '07:00 - 20:00',
    priceTier: PriceTier.PREMIUM,
    coords: { lat: -2.990000, lng: 104.740000 },
    isSponsored: true,
    sponsoredUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    sponsoredRank: 2,
    coverUrl: 'https://picsum.photos/800/600?random=8',
    vibes: [VIBES[0], VIBES[4]], // Cozy, Klasik
    amenities: [AMENITIES[0], AMENITIES[1], AMENITIES[2], AMENITIES[4], AMENITIES[5]],
    spots: [
         { id: 's5', title: 'Perpustakaan Mini', tip: 'Ambil foto candid lagi baca buku, aesthetic!', photoUrl: 'https://picsum.photos/600/400?random=9' }
    ],
    reviews: [],
    ...calculateAverages([])
  },
  {
    id: '5',
    slug: 'kopi-sudut-cerita',
    name: 'Kopi Sudut Cerita',
    address: 'Jl. Kol. H. Burlian No. 88, Sukarami, Palembang',
    district: 'Sukarami',
    openingHours: '08:00 - 23:00',
    priceTier: PriceTier.STANDARD,
    coords: { lat: -2.9245, lng: 104.7073 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    coverUrl: 'https://picsum.photos/800/600?random=10',
    vibes: [VIBES[1], VIBES[0]], // Minimalis, Cozy
    amenities: [AMENITIES[0], AMENITIES[1], AMENITIES[2], AMENITIES[4], AMENITIES[6]],
    spots: [
      { id: 's6', title: 'Kursi Jendela', tip: 'Best spot buat ngelamun sambil liat hujan.', photoUrl: 'https://picsum.photos/600/400?random=11' }
    ],
    reviews: initialReviews5,
    ...calculateAverages(initialReviews5)
  },
  {
    id: '6',
    slug: 'titik-kumpul',
    name: 'Titik Kumpul',
    address: 'Jl. MP. Mangkunegara No. 12, Sako, Palembang',
    district: 'Sako',
    openingHours: '11:00 - 00:00',
    priceTier: PriceTier.BUDGET,
    coords: { lat: -2.9493, lng: 104.8011 },
    isSponsored: true,
    sponsoredUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    sponsoredRank: 3,
    coverUrl: 'https://picsum.photos/800/600?random=12',
    vibes: [VIBES[2]], // Industrial
    amenities: [AMENITIES[0], AMENITIES[3], AMENITIES[6]],
    spots: [
      { id: 's7', title: 'Container Merah', tip: 'Foto di depan container merahnya, kontras dan eye-catching!', photoUrl: 'https://picsum.photos/600/400?random=13' }
    ],
    reviews: initialReviews6,
    ...calculateAverages(initialReviews6)
  },
  {
    id: '7',
    slug: 'omah-kopi',
    name: 'Omah Kopi',
    address: 'Jl. Inspektur Marzuki, Kemuning, Palembang',
    district: 'Kemuning',
    openingHours: '09:00 - 22:00',
    priceTier: PriceTier.STANDARD,
    coords: { lat: -2.9668, lng: 104.7494 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    coverUrl: 'https://picsum.photos/800/600?random=14',
    vibes: [VIBES[4], VIBES[3]], // Klasik, Tropical
    amenities: [AMENITIES[0], AMENITIES[1], AMENITIES[3], AMENITIES[4], AMENITIES[5]],
    spots: [
      { id: 's8', title: 'Pendopo Joglo', tip: 'Duduk di pendopo, berasa lagi di Jawa.', photoUrl: 'https://picsum.photos/600/400?random=15' }
    ],
    reviews: initialReviews7,
    ...calculateAverages(initialReviews7)
  },
  {
    id: '8',
    slug: 'the-reading-room',
    name: 'The Reading Room',
    address: 'Jl. Kapten A. Rivai No. 99, Ilir Barat II, Palembang',
    district: 'Ilir Barat II',
    openingHours: '10:00 - 21:00',
    priceTier: PriceTier.PREMIUM,
    coords: { lat: -2.9882, lng: 104.7501 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    coverUrl: 'https://picsum.photos/800/600?random=16',
    vibes: [VIBES[0]], // Cozy
    amenities: [AMENITIES[0], AMENITIES[1], AMENITIES[2], AMENITIES[4], AMENITIES[5]],
    spots: [
      { id: 's9', title: 'Rak Buku Raksasa', tip: 'Angle foto dari bawah biar rak bukunya kelihatan megah.', photoUrl: 'https://picsum.photos/600/400?random=17' }
    ],
    reviews: initialReviews8,
    ...calculateAverages(initialReviews8)
  },
  {
    id: '9',
    slug: 'paradoks-kopi',
    name: 'Paradoks Kopi',
    address: 'Jl. Soekarno-Hatta, Alang-Alang Lebar, Palembang',
    district: 'Alang-Alang Lebar',
    openingHours: '08:00 - 22:00',
    priceTier: PriceTier.STANDARD,
    coords: { lat: -2.9379, lng: 104.6853 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    coverUrl: 'https://picsum.photos/800/600?random=18',
    vibes: [VIBES[2]], // Industrial
    amenities: [AMENITIES[0], AMENITIES[1], AMENITIES[3], AMENITIES[4]],
    spots: [
        { id: 's10', title: 'Dinding Semen Ekspos', tip: 'Gunakan outfit monokrom untuk hasil foto yang artsy.', photoUrl: 'https://picsum.photos/600/400?random=19' }
    ],
    reviews: initialReviews9,
    ...calculateAverages(initialReviews9)
  },
  {
    id: '10',
    slug: 'skena-sore',
    name: 'Skena Sore',
    address: 'Jl. R. E. Martadinata, Kalidoni, Palembang',
    district: 'Kalidoni',
    openingHours: '15:00 - 23:00',
    priceTier: PriceTier.STANDARD,
    coords: { lat: -2.9691, lng: 104.7958 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    coverUrl: 'https://picsum.photos/800/600?random=20',
    vibes: [VIBES[3], VIBES[1]], // Tropical, Minimalis
    amenities: [AMENITIES[0], AMENITIES[3], AMENITIES[6]],
    spots: [
      { id: 's11', title: 'Bean Bag Area', tip: 'Foto candid pas lagi chill di bean bag, auto santai.', photoUrl: 'https://picsum.photos/600/400?random=21' }
    ],
    reviews: initialReviews10,
    ...calculateAverages(initialReviews10)
  },
   {
    id: '11',
    slug: 'kopi-tiam-1988',
    name: 'Kopi Tiam 1988',
    address: 'Jl. Veteran No. 1988, Ilir Timur III, Palembang',
    district: 'Ilir Timur III',
    openingHours: '07:00 - 21:00',
    priceTier: PriceTier.BUDGET,
    coords: { lat: -2.9785, lng: 104.7661 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    coverUrl: 'https://picsum.photos/800/600?random=22',
    vibes: [VIBES[4]], // Klasik
    amenities: [AMENITIES[4], AMENITIES[2]],
    spots: [
      { id: 's12', title: 'Meja Marmer Bundar', tip: 'Tempat wajib buat foto kopi dan roti bakar.', photoUrl: 'https://picsum.photos/600/400?random=23' }
    ],
    reviews: initialReviews11,
    ...calculateAverages(initialReviews11)
  },
  {
    id: '12',
    slug: 'ethereal-garden',
    name: 'Ethereal Garden',
    address: 'Jl. Gubernur H. A. Bastari, Jakabaring, Palembang',
    district: 'Jakabaring',
    openingHours: '10:00 - 22:00',
    priceTier: PriceTier.PREMIUM,
    coords: { lat: -3.0274, lng: 104.7757 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    coverUrl: 'https://picsum.photos/800/600?random=24',
    vibes: [VIBES[3]], // Tropical
    amenities: [AMENITIES[0], AMENITIES[2], AMENITIES[3], AMENITIES[4], AMENITIES[6]],
    spots: [
      { id: 's13', title: 'Air Mancur Mini', tip: 'Foto dengan latar belakang air mancur di malam hari.', photoUrl: 'https://picsum.photos/600/400?random=25' }
    ],
    reviews: initialReviews12,
    ...calculateAverages(initialReviews12)
  },
  {
    id: '13',
    slug: 'beton-baja-coffee',
    name: 'Beton & Baja Coffee',
    address: 'Jl. Bypass, Sematang Borang, Palembang',
    district: 'Sematang Borang',
    openingHours: '14:00 - 00:00',
    priceTier: PriceTier.STANDARD,
    coords: { lat: -2.9571, lng: 104.8382 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    coverUrl: 'https://picsum.photos/800/600?random=26',
    vibes: [VIBES[2]], // Industrial
    amenities: [AMENITIES[0], AMENITIES[1], AMENITIES[3], AMENITIES[6]],
    spots: [
      { id: 's14', title: 'Rooftop View Tol', tip: 'Dapatkan cityscape Palembang dari rooftop cafe ini.', photoUrl: 'https://picsum.photos/600/400?random=27' }
    ],
    reviews: initialReviews13,
    ...calculateAverages(initialReviews13)
  },
  {
    id: '14',
    slug: 'kopi-pelajar',
    name: 'Kopi Pelajar',
    address: 'Jl. Padang Selasa, Bukit Kecil, Palembang',
    district: 'Bukit Kecil',
    openingHours: '09:00 - 23:00',
    priceTier: PriceTier.BUDGET,
    coords: { lat: -2.9899, lng: 104.7450 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    coverUrl: 'https://picsum.photos/800/600?random=28',
    vibes: [VIBES[0]], // Cozy
    amenities: [AMENITIES[0], AMENITIES[1]],
    spots: [
      { id: 's15', title: 'Pojok Baca', tip: 'Simple but effective. Banyak buku properti foto.', photoUrl: 'https://picsum.photos/600/400?random=29' }
    ],
    reviews: initialReviews14,
    ...calculateAverages(initialReviews14)
  },
  {
    id: '15',
    slug: 'the-glass-house',
    name: 'The Glass House',
    address: 'Jl. Jenderal Ahmad Yani, Plaju, Palembang',
    district: 'Plaju',
    openingHours: '10:00 - 22:00',
    priceTier: PriceTier.PREMIUM,
    coords: { lat: -3.0035, lng: 104.7937 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    coverUrl: 'https://picsum.photos/800/600?random=30',
    vibes: [VIBES[1]], // Minimalis
    amenities: [AMENITIES[0], AMENITIES[1], AMENITIES[2], AMENITIES[4], AMENITIES[6]],
    spots: [
      { id: 's16', title: 'Dinding Kaca Penuh', tip: 'Datang saat sore untuk siluet foto yang dramatis.', photoUrl: 'https://picsum.photos/600/400?random=31' }
    ],
    reviews: initialReviews15,
    ...calculateAverages(initialReviews15)
  },
  {
    id: '16',
    slug: 'warung-nugas',
    name: 'Warung Nugas',
    address: 'Jl. K.H.A. Azhari, Seberang Ulu I, Palembang',
    district: 'Seberang Ulu I',
    openingHours: '24 Jam',
    priceTier: PriceTier.BUDGET,
    coords: { lat: -3.0051, lng: 104.7709 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    coverUrl: 'https://picsum.photos/800/600?random=32',
    vibes: [], // No specific vibe
    amenities: [AMENITIES[0], AMENITIES[1]],
    spots: [
      { id: 's17', title: 'Meja Paling Pojok', tip: 'Spot paling strategis buat ngeliatin orang sambil nugas.', photoUrl: 'https://picsum.photos/600/400?random=33' }
    ],
    reviews: initialReviews16,
    ...calculateAverages(initialReviews16)
  },
  {
    id: '17',
    slug: 'senandung-pagi',
    name: 'Senandung Pagi',
    address: 'Jl. Pangeran Ratu, Seberang Ulu II, Palembang',
    district: 'Seberang Ulu II',
    openingHours: '07:00 - 18:00',
    priceTier: PriceTier.STANDARD,
    coords: { lat: -3.0205, lng: 104.7891 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    coverUrl: 'https://picsum.photos/800/600?random=34',
    vibes: [VIBES[0], VIBES[4]], // Cozy, Klasik
    amenities: [AMENITIES[0], AMENITIES[3], AMENITIES[4], AMENITIES[5]],
    spots: [
      { id: 's18', title: 'Teras Belakang', tip: 'Nikmati kopi pagi ditemani semilir angin.', photoUrl: 'https://picsum.photos/600/400?random=35' }
    ],
    reviews: initialReviews17,
    ...calculateAverages(initialReviews17)
  },
  {
    id: '18',
    slug: 'tropicoffee',
    name: 'Tropicoffee',
    address: 'Jl. Alamsyah Ratu Prawiranegara, Gandus, Palembang',
    district: 'Gandus',
    openingHours: '09:00 - 21:00',
    priceTier: PriceTier.STANDARD,
    coords: { lat: -2.9996, lng: 104.6908 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    coverUrl: 'https://picsum.photos/800/600?random=36',
    vibes: [VIBES[3]], // Tropical
    amenities: [AMENITIES[0], AMENITIES[3], AMENITIES[4], AMENITIES[6]],
    spots: [
      { id: 's19', title: 'Pohon Kaktus Raksasa', tip: 'Iconic spot, wajib foto di sini!', photoUrl: 'https://picsum.photos/600/400?random=37' }
    ],
    reviews: initialReviews18,
    ...calculateAverages(initialReviews18)
  },
  {
    id: '19',
    slug: 'pojok-digital',
    name: 'Pojok Digital',
    address: 'Jl. Demang Lebar Daun No. 1, Ilir Barat I, Palembang',
    district: 'Ilir Barat I',
    openingHours: '08:00 - 00:00',
    priceTier: PriceTier.STANDARD,
    coords: { lat: -2.9790, lng: 104.7350 },
    isSponsored: false,
    sponsoredUntil: null,
    sponsoredRank: 0,
    coverUrl: 'https://picsum.photos/800/600?random=38',
    vibes: [VIBES[1]], // Minimalis
    amenities: [AMENITIES[0], AMENITIES[1], AMENITIES[2], AMENITIES[4]],
    spots: [
      { id: 's20', title: 'Working Desk Panjang', tip: 'Foto flatlay laptop, kopi, dan notebook.', photoUrl: 'https://picsum.photos/600/400?random=39' }
    ],
    reviews: initialReviews19,
    ...calculateAverages(initialReviews19)
  },
  {
    id: '20',
    slug: 'langit-palembang',
    name: 'Langit Palembang',
    address: 'Jl. Kol. H. Burlian Km. 9, Sukarami, Palembang',
    district: 'Sukarami',
    openingHours: '16:00 - 01:00',
    priceTier: PriceTier.LUXURY,
    coords: { lat: -2.9150, lng: 104.7000 },
    isSponsored: true,
    sponsoredUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    sponsoredRank: 0, // Top tier
    logoUrl: 'https://picsum.photos/200/200?random=120',
    coverUrl: 'https://picsum.photos/800/600?random=40',
    vibes: [VIBES[0]], // Cozy (in a luxurious way)
    amenities: [AMENITIES[0], AMENITIES[2], AMENITIES[4], AMENITIES[6]],
    spots: [
      { id: 's21', title: 'Tepi Infinity Pool', tip: 'Best view of the city, especially at night.', photoUrl: 'https://picsum.photos/600/400?random=41' }
    ],
    reviews: initialReviews20,
    ...calculateAverages(initialReviews20)
  },
];