import React from 'react';
import { Event } from '../types';
import { CalendarDaysIcon } from '@heroicons/react/24/solid';
import ImageWithFallback from './common/ImageWithFallback';

interface EventCardProps {
    event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
    const formatDate = (date: string | Date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const startDate = formatDate(event.start_date);
    const endDate = formatDate(event.end_date);

    return (
        <div className="bg-soft dark:bg-gray-700/50 p-4 rounded-2xl border border-border flex flex-col sm:flex-row items-start gap-4">
            {event.imageUrl && (
                <ImageWithFallback 
                    src={event.imageUrl} 
                    alt={event.name} 
                    className="w-full sm:w-32 h-32 object-cover rounded-lg flex-shrink-0"
                    width={150}
                    height={150}
                />
            )}
            <div className="flex-grow">
                <h4 className="font-bold text-lg font-jakarta">{event.name}</h4>
                <div className="flex items-center gap-2 text-sm text-brand font-semibold my-2">
                    <CalendarDaysIcon className="h-5 w-5" />
                    <span>{startDate === endDate ? startDate : `${startDate} - ${endDate}`}</span>
                </div>
                <p className="text-muted text-sm">{event.description}</p>
            </div>
        </div>
    );
};

export default EventCard;