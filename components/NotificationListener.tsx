import { useEffect } from 'react';
import { onSnapshot, query, collection, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useToast } from '../contexts/ToastContext';
import { useAppContext } from '../contexts/AppContext';

export const NotificationListener = ({ currentUserId }: { currentUserId: string }) => {
  const { addToast } = useToast();
  const { viewTask, fetchTaskById, selectProject } = useAppContext();

  useEffect(() => {
    if (!currentUserId) return;

    // Listen for new, unread notifications created after the app loaded
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUserId),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Only show toast if the notification is brand new (created in last 10s)
          if (data.createdAt?.toMillis() > Date.now() - 10000) {
            addToast({
              type: 'notification',
              title: data.actorName || 'New Notification',
              message: data.message,
              action: data.taskId ? {
                label: 'View Task',
                onClick: async () => {
                  if (data.projectId) selectProject(data.projectId);
                  const task = await fetchTaskById(data.taskId);
                  if (task) viewTask(task);
                }
              } : undefined
            });
          }
        }
      });
    });

    return () => unsubscribe();
  }, [currentUserId, addToast, fetchTaskById, selectProject, viewTask]);

  return null;
};
