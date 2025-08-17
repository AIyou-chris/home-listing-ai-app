import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    Timestamp,
    writeBatch,
    onSnapshot,
    QuerySnapshot,
    DocumentData
} from 'firebase/firestore';
import { db } from './firebase';
import { 
    User, 
    AdminSettings, 
    BroadcastMessage, 
    SystemAlert, 
    RetentionCampaign, 
    UserNotification 
} from '../types';

// Collection names
const COLLECTIONS = {
    USERS: 'users',
    ADMIN_SETTINGS: 'admin_settings',
    BROADCAST_MESSAGES: 'broadcast_messages',
    SYSTEM_ALERTS: 'system_alerts',
    RETENTION_CAMPAIGNS: 'retention_campaigns',
    USER_NOTIFICATIONS: 'user_notifications'
} as const;

// Helper function to convert Firestore Timestamp to string
const timestampToString = (timestamp: any): string => {
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toISOString();
    }
    return timestamp;
};

// Helper function to convert string to Firestore Timestamp
const stringToTimestamp = (dateString: string): Timestamp => {
    return Timestamp.fromDate(new Date(dateString));
};

// Generic CRUD operations
export class DatabaseService {
    // Users Collection
    static async createUser(userData: Omit<User, 'id'>): Promise<string> {
        const docRef = await addDoc(collection(db, COLLECTIONS.USERS), {
            ...userData,
            dateJoined: Timestamp.now(),
            lastActive: Timestamp.now()
        });
        return docRef.id;
    }

    static async getUser(userId: string): Promise<User | null> {
        const docRef = doc(db, COLLECTIONS.USERS, userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                dateJoined: timestampToString(data.dateJoined),
                lastActive: timestampToString(data.lastActive),
                renewalDate: data.renewalDate ? timestampToString(data.renewalDate) : ''
            } as User;
        }
        return null;
    }

    static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
        const docRef = doc(db, COLLECTIONS.USERS, userId);
        const updateData: any = { ...updates };
        
        if (updates.lastActive) {
            updateData.lastActive = Timestamp.now();
        }
        if (updates.renewalDate) {
            updateData.renewalDate = stringToTimestamp(updates.renewalDate);
        }
        
        await updateDoc(docRef, updateData);
    }

    static async getUsersByRole(role: User['role']): Promise<User[]> {
        const q = query(
            collection(db, COLLECTIONS.USERS),
            where('role', '==', role),
            orderBy('dateJoined', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dateJoined: timestampToString(doc.data().dateJoined),
            lastActive: timestampToString(doc.data().lastActive),
            renewalDate: doc.data().renewalDate ? timestampToString(doc.data().renewalDate) : ''
        })) as User[];
    }

    static async getUsersByStatus(status: User['status']): Promise<User[]> {
        const q = query(
            collection(db, COLLECTIONS.USERS),
            where('status', '==', status)
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dateJoined: timestampToString(doc.data().dateJoined),
            lastActive: timestampToString(doc.data().lastActive),
            renewalDate: doc.data().renewalDate ? timestampToString(doc.data().renewalDate) : ''
        })) as User[];
    }

    // Admin Settings Collection
    static async getAdminSettings(): Promise<AdminSettings | null> {
        const q = query(collection(db, COLLECTIONS.ADMIN_SETTINGS), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() } as AdminSettings;
        }
        return null;
    }

    static async createAdminSettings(settings: Omit<AdminSettings, 'id'>): Promise<string> {
        const docRef = await addDoc(collection(db, COLLECTIONS.ADMIN_SETTINGS), settings);
        return docRef.id;
    }

    static async updateAdminSettings(settingsId: string, updates: Partial<AdminSettings>): Promise<void> {
        const docRef = doc(db, COLLECTIONS.ADMIN_SETTINGS, settingsId);
        await updateDoc(docRef, updates);
    }

    // Broadcast Messages Collection
    static async createBroadcastMessage(messageData: Omit<BroadcastMessage, 'id'>): Promise<string> {
        const docRef = await addDoc(collection(db, COLLECTIONS.BROADCAST_MESSAGES), {
            ...messageData,
            sentAt: Timestamp.now(),
            scheduledFor: messageData.scheduledFor ? stringToTimestamp(messageData.scheduledFor) : null,
            deliveryStats: {
                totalRecipients: 0,
                delivered: 0,
                read: 0,
                failed: 0
            }
        });
        return docRef.id;
    }

    static async getBroadcastMessages(status?: BroadcastMessage['status']): Promise<BroadcastMessage[]> {
        let q = query(
            collection(db, COLLECTIONS.BROADCAST_MESSAGES),
            orderBy('sentAt', 'desc')
        );
        
        if (status) {
            q = query(q, where('status', '==', status));
        }
        
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            sentAt: timestampToString(doc.data().sentAt),
            scheduledFor: doc.data().scheduledFor ? timestampToString(doc.data().scheduledFor) : undefined
        })) as BroadcastMessage[];
    }

    static async updateBroadcastMessage(messageId: string, updates: Partial<BroadcastMessage>): Promise<void> {
        const docRef = doc(db, COLLECTIONS.BROADCAST_MESSAGES, messageId);
        const updateData: any = { ...updates };
        
        if (updates.scheduledFor) {
            updateData.scheduledFor = stringToTimestamp(updates.scheduledFor);
        }
        
        await updateDoc(docRef, updateData);
    }

    // System Alerts Collection
    static async createSystemAlert(alertData: Omit<SystemAlert, 'id' | 'createdAt'>): Promise<string> {
        const docRef = await addDoc(collection(db, COLLECTIONS.SYSTEM_ALERTS), {
            ...alertData,
            createdAt: Timestamp.now(),
            status: 'active'
        });
        return docRef.id;
    }

    static async getSystemAlerts(status?: SystemAlert['status']): Promise<SystemAlert[]> {
        let q = query(
            collection(db, COLLECTIONS.SYSTEM_ALERTS),
            orderBy('createdAt', 'desc')
        );
        
        if (status) {
            q = query(q, where('status', '==', status));
        }
        
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: timestampToString(doc.data().createdAt),
            acknowledgedAt: doc.data().acknowledgedAt ? timestampToString(doc.data().acknowledgedAt) : undefined,
            resolvedAt: doc.data().resolvedAt ? timestampToString(doc.data().resolvedAt) : undefined
        })) as SystemAlert[];
    }

    static async acknowledgeSystemAlert(alertId: string, acknowledgedBy: string): Promise<void> {
        const docRef = doc(db, COLLECTIONS.SYSTEM_ALERTS, alertId);
        await updateDoc(docRef, {
            status: 'acknowledged',
            acknowledgedBy,
            acknowledgedAt: Timestamp.now()
        });
    }

    static async resolveSystemAlert(alertId: string): Promise<void> {
        const docRef = doc(db, COLLECTIONS.SYSTEM_ALERTS, alertId);
        await updateDoc(docRef, {
            status: 'resolved',
            resolvedAt: Timestamp.now()
        });
    }

    // Retention Campaigns Collection
    static async createRetentionCampaign(campaignData: Omit<RetentionCampaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const now = Timestamp.now();
        const docRef = await addDoc(collection(db, COLLECTIONS.RETENTION_CAMPAIGNS), {
            ...campaignData,
            createdAt: now,
            updatedAt: now
        });
        return docRef.id;
    }

    static async getRetentionCampaigns(isActive?: boolean): Promise<RetentionCampaign[]> {
        let q = query(
            collection(db, COLLECTIONS.RETENTION_CAMPAIGNS),
            orderBy('createdAt', 'desc')
        );
        
        if (isActive !== undefined) {
            q = query(q, where('isActive', '==', isActive));
        }
        
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: timestampToString(doc.data().createdAt),
            updatedAt: timestampToString(doc.data().updatedAt)
        })) as RetentionCampaign[];
    }

    static async updateRetentionCampaign(campaignId: string, updates: Partial<RetentionCampaign>): Promise<void> {
        const docRef = doc(db, COLLECTIONS.RETENTION_CAMPAIGNS, campaignId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: Timestamp.now()
        });
    }

    // User Notifications Collection
    static async createUserNotification(notificationData: Omit<UserNotification, 'id' | 'createdAt'>): Promise<string> {
        const docRef = await addDoc(collection(db, COLLECTIONS.USER_NOTIFICATIONS), {
            ...notificationData,
            createdAt: Timestamp.now(),
            read: false
        });
        return docRef.id;
    }

    static async getUserNotifications(userId: string, read?: boolean): Promise<UserNotification[]> {
        let q = query(
            collection(db, COLLECTIONS.USER_NOTIFICATIONS),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        
        if (read !== undefined) {
            q = query(q, where('read', '==', read));
        }
        
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: timestampToString(doc.data().createdAt),
            readAt: doc.data().readAt ? timestampToString(doc.data().readAt) : undefined,
            expiresAt: doc.data().expiresAt ? timestampToString(doc.data().expiresAt) : undefined
        })) as UserNotification[];
    }

    static async markNotificationAsRead(notificationId: string): Promise<void> {
        const docRef = doc(db, COLLECTIONS.USER_NOTIFICATIONS, notificationId);
        await updateDoc(docRef, {
            read: true,
            readAt: Timestamp.now()
        });
    }

    static async markAllNotificationsAsRead(userId: string): Promise<void> {
        const notifications = await this.getUserNotifications(userId, false);
        const batch = writeBatch(db);
        
        notifications.forEach(notification => {
            const docRef = doc(db, COLLECTIONS.USER_NOTIFICATIONS, notification.id);
            batch.update(docRef, {
                read: true,
                readAt: Timestamp.now()
            });
        });
        
        await batch.commit();
    }

    static async getUnreadNotificationCount(userId: string): Promise<number> {
        const q = query(
            collection(db, COLLECTIONS.USER_NOTIFICATIONS),
            where('userId', '==', userId),
            where('read', '==', false)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.size;
    }

    // Real-time listeners
    static subscribeToUserNotifications(userId: string, callback: (notifications: UserNotification[]) => void) {
        const q = query(
            collection(db, COLLECTIONS.USER_NOTIFICATIONS),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        
        return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const notifications = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: timestampToString(doc.data().createdAt),
                readAt: doc.data().readAt ? timestampToString(doc.data().readAt) : undefined,
                expiresAt: doc.data().expiresAt ? timestampToString(doc.data().expiresAt) : undefined
            })) as UserNotification[];
            callback(notifications);
        });
    }

    static subscribeToSystemAlerts(callback: (alerts: SystemAlert[]) => void) {
        const q = query(
            collection(db, COLLECTIONS.SYSTEM_ALERTS),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc')
        );
        
        return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const alerts = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: timestampToString(doc.data().createdAt),
                acknowledgedAt: doc.data().acknowledgedAt ? timestampToString(doc.data().acknowledgedAt) : undefined,
                resolvedAt: doc.data().resolvedAt ? timestampToString(doc.data().resolvedAt) : undefined
            })) as SystemAlert[];
            callback(alerts);
        });
    }
}

export default DatabaseService;
