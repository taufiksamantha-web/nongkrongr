import React from 'react';
import { Link } from 'react-router-dom';
import { SparklesIcon, UsersIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';

const MissionCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg hover:shadow-primary/20 transition-shadow duration-300 transform hover:-translate-y-1">
    <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary mb-6">
      {icon}
    </div>
    <h3 className="text-2xl font-bold font-jakarta mb-3">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400">{children}</p>
  </div>
);

const AboutPage: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold font-jakarta bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-pink">
          Cerita di Balik Secangkir Kopi
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Nongkrongr lahir dari kecintaan pada kopi dan kota Palembang. Kami percaya setiap sudut kota ini menyimpan cerita, dan setiap kedai kopi adalah panggungnya. Misi kami adalah menjadi teman terbaikmu dalam menjelajahi panggung-panggung itu.
        </p>
      </div>

      {/* Mission Section */}
      <div className="bg-gray-50 dark:bg-gray-900 py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold font-jakarta">Misi Kami</h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Lebih dari sekadar aplikasi, ini adalah gerakan.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <MissionCard
              icon={<SparklesIcon className="h-8 w-8" />}
              title="Menemukan Hidden Gems"
            >
              Kami menjelajahi setiap sudut Palembang untuk menemukan kafe-kafe tersembunyi yang punya karakter unik, agar kamu bisa merasakan pengalaman baru di luar tempat mainstream.
            </MissionCard>
            <MissionCard
              icon={<UsersIcon className="h-8 w-8" />}
              title="Membangun Komunitas"
            >
              Nongkrongr adalah wadah bagi para penikmat kopi untuk berbagi review jujur, spot foto terbaik, dan rekomendasi personal, menciptakan komunitas yang saling menginspirasi.
            </MissionCard>
            <MissionCard
              icon={<BuildingStorefrontIcon className="h-8 w-8" />}
              title="Mendukung Bisnis Lokal"
            >
              Dengan mempromosikan kafe-kafe lokal, kami berharap dapat membantu mereka tumbuh dan berkembang, menjadikan ekosistem kopi di Palembang semakin hidup dan beragam.
            </MissionCard>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-6 py-16 text-center">
        <h2 className="text-4xl font-bold font-jakarta mb-4">Siap Menjadi Bagian dari Cerita?</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          Petualangan kopimu di Palembang dimulai di sini. Jelajahi, review, dan temukan spot favorit barumu bersama ribuan penikmat kopi lainnya.
        </p>
        <Link 
          to="/explore"
          className="bg-primary text-white font-bold py-4 px-10 rounded-2xl text-lg hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 shadow-lg focus:ring-4 focus:ring-primary/30"
        >
          Mulai Menjelajah Sekarang!
        </Link>
      </div>
    </div>
  );
};

export default AboutPage;