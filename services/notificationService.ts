
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Notification, NotificationPreferences } from '../types';

export const notificationService = {
    async create(
        targetUserId: string, 
        type: Notification['type'], 
        message: string, 
        actor: { name: string; avatarUrl: string },
        metadata: { taskId?: string; projectId?: string; taskTitle?: string; link?: string },
        preferences?: NotificationPreferences
    ) {
        if (!targetUserId) return;

        // Check granular toggles if provided
        if (preferences) {
            const typeToPrefMap: Record<Notification['type'], keyof NotificationPreferences> = {
                'mention': 'mentions',
                'assignment': 'assignments',
                'deadline': 'deadlines',
                'goal': 'goals',
                'form': 'forms',
                'handoff': 'handoffs'
            };

            const prefKey = typeToPrefMap[type];
            if (prefKey && preferences[prefKey] === false) {
                console.log(`DEBUG: Notification suppressed by user preference: ${type}`, { userId: targetUserId, prefKey, preferences });
                return;
            }
        } else {
            console.log(`DEBUG: No preferences found for user ${targetUserId}, proceeding with notification creation.`);
        }

        try {
            await addDoc(collection(db, 'notifications'), {
                userId: targetUserId,
                type,
                message,
                actorName: actor.name,
                actorAvatarUrl: actor.avatarUrl,
                read: false,
                createdAt: serverTimestamp(),
                ...metadata
            });
        } catch (error) {
            console.error("Failed to create notification", error);
        }
    },

    /**
     * Checks if a specific notification already exists for today to prevent spam.
     * Useful for deadline reminders.
     */
    async hasNotifiedToday(targetUserId: string, taskId: string, type: Notification['type']): Promise<boolean> {
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);

        const q = query(
            collection(db, 'notifications'), 
            where('userId', '==', targetUserId),
            where('taskId', '==', taskId),
            where('type', '==', type),
            where('createdAt', '>=', startOfDay)
        );

        const snapshot = await getDocs(q);
        return !snapshot.empty;
    },

    /**
     * Checks if a notification should be suppressed (e.g., in-app cooling period).
     */
    async shouldSuppress(targetUserId: string, taskId: string, type: Notification['type']): Promise<boolean> {
        // Check if notified in the last 5 minutes (Cooling period)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', targetUserId),
            where('taskId', '==', taskId),
            where('type', '==', type),
            where('createdAt', '>=', fiveMinutesAgo)
        );
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    },

    async sendGoogleChatWebhook(webhookUrl: string, message: string) {
        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: message })
            });
        } catch (error) {
            console.error("Failed to send webhook notification", error);
        }
    }
};
