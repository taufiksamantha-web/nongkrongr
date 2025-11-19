
/**
 * Parses a time string "HH:MM" into total minutes from midnight.
 * @param timeStr The time string to parse.
 * @returns Total minutes from midnight, or null if format is invalid.
 */
const parseTime = (timeStr: string): number | null => {
    const timeParts = timeStr.trim().split(':');
    if (timeParts.length !== 2) return null;
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
};

export type OpeningStatus = {
    isOpen: boolean;
    status: 'open' | 'closed' | 'opening_soon' | 'closing_soon' | 'unknown';
    message: string;
    color: string;
};

/**
 * Checks detailed opening status including "Opening Soon" and "Closing Soon".
 * Buffer time is 60 minutes.
 */
export const getOpeningStatus = (openingHours: string): OpeningStatus => {
    if (!openingHours) return { isOpen: false, status: 'unknown', message: 'Jam tidak tersedia', color: 'text-gray-500 bg-gray-100 dark:bg-gray-800' };
    if (openingHours.toLowerCase().includes('24')) return { isOpen: true, status: 'open', message: 'Buka 24 Jam', color: 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300' };

    const parts = openingHours.split(' - ');
    if (parts.length !== 2) return { isOpen: false, status: 'unknown', message: '', color: 'text-gray-500' };

    const openTime = parseTime(parts[0]);
    const closeTime = parseTime(parts[1]);

    if (openTime === null || closeTime === null) return { isOpen: false, status: 'unknown', message: '', color: 'text-gray-500' };

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const bufferMinutes = 60;

    // Normalize times for calculation
    let effectiveCloseTime = closeTime;
    if (closeTime < openTime) {
        effectiveCloseTime += 24 * 60; // Add 24 hours if closing next day
    }
    
    let effectiveCurrentTime = currentTime;
    // If currently early morning (e.g. 01:00) and place closes at 02:00, treat current as next day relative to open
    if (closeTime < openTime && currentTime < closeTime) {
        effectiveCurrentTime += 24 * 60;
    }

    const isOpen = effectiveCurrentTime >= openTime && effectiveCurrentTime < effectiveCloseTime;
    
    // Check Opening Soon (if not open yet, but within buffer before open)
    if (!isOpen && effectiveCurrentTime < openTime && (openTime - effectiveCurrentTime) <= bufferMinutes) {
         const diff = openTime - effectiveCurrentTime;
         return { isOpen: false, status: 'opening_soon', message: `Buka sebentar lagi (${diff} mnt)`, color: 'text-yellow-800 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300' };
    }

    // Check Closing Soon (if open, and within buffer before close)
    if (isOpen && (effectiveCloseTime - effectiveCurrentTime) <= bufferMinutes) {
        const diff = effectiveCloseTime - effectiveCurrentTime;
        return { isOpen: true, status: 'closing_soon', message: `Segera Tutup (${diff} mnt)`, color: 'text-orange-800 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300' };
    }

    if (isOpen) {
        return { isOpen: true, status: 'open', message: 'Sedang Buka', color: 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300' };
    } else {
        return { isOpen: false, status: 'closed', message: 'Tutup', color: 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300' };
    }
};

/**
 * Legacy check (boolean only), kept for backward compatibility if needed
 */
export const checkIfOpen = (openingHours: string): boolean => {
    return getOpeningStatus(openingHours).isOpen;
};

export const checkIfOpenLate = (openingHours: string): boolean => {
    if (!openingHours) return false;
    if (openingHours.toLowerCase().includes('24')) return true;

    const parts = openingHours.split(' - ');
    if (parts.length !== 2) return false;

    const openTime = parseTime(parts[0]);
    const closeTime = parseTime(parts[1]);

    if (openTime === null || closeTime === null) return false;

    const lateThreshold = 23 * 60; // 11:00 PM in minutes

    // Handle overnight case (e.g., closes at 01:00, 02:00)
    if (closeTime < openTime) {
        return true;
    }

    // Same day case
    return closeTime >= lateThreshold;
};
