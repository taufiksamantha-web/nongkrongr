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

/**
 * Checks if a cafe is currently open based on its opening hours string.
 * @param openingHours The opening hours string (e.g., "08:00 - 22:00", "24 Jam").
 * @returns True if the cafe is currently open, false otherwise.
 */
export const checkIfOpen = (openingHours: string): boolean => {
    if (!openingHours) return false; // Assume closed if no data
    if (openingHours.toLowerCase().includes('24')) return true;

    const parts = openingHours.split(' - ');
    if (parts.length !== 2) return false; // Invalid format, assume closed

    const openTime = parseTime(parts[0]);
    const closeTime = parseTime(parts[1]);

    if (openTime === null || closeTime === null) return false; // Invalid time format

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Handle overnight case (e.g., 16:00 - 02:00)
    if (closeTime < openTime) {
        return currentTime >= openTime || currentTime < closeTime;
    }
    
    // Same day case (e.g., 08:00 - 22:00)
    return currentTime >= openTime && currentTime < closeTime;
};

/**
 * Checks if a cafe is open late (closes at or after 11 PM).
 * @param openingHours The opening hours string.
 * @returns True if the cafe closes late, false otherwise.
 */
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
