import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { logActivity } from '../api';

/**
 * Custom hook for logging user activity.
 * Silently logs actions to the backend for analytics and monitoring.
 * 
 * Usage:
 *   const { logUserActivity } = useActivityLogger();
 *   logUserActivity('VIEW_RESULT', '120211010002', { exam_id: 'HSC_2024' });
 */
export const useActivityLogger = () => {
    const { user } = useAuth();

    /**
     * Log a user activity
     * @param {string} action - Action type: VIEW_RESULT, COMPARE_RESULT, etc.
     * @param {string|null} targetRoll - The student being viewed/compared
     * @param {object|null} metadata - Additional context (exam info, etc.)
     */
    const logUserActivity = useCallback(async (action, targetRoll = null, metadata = null) => {
        try {
            // Only log if user is logged in
            if (!user || !user.roll) {
                console.debug('[ActivityLogger] No user session, skipping log');
                return;
            }

            await logActivity(action, targetRoll, metadata, user.roll);
            console.debug(`[ActivityLogger] Logged: ${action}`, { targetRoll, metadata });
        } catch (error) {
            // Silent fail - don't disrupt user experience
            console.warn('[ActivityLogger] Failed to log activity:', error.message);
        }
    }, [user]);

    return { logUserActivity };
};

export default useActivityLogger;
