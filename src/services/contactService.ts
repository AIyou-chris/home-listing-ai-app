// Firebase removed: this file is no longer used by UI (Supabase version exists)
// Keep minimal local types for compatibility if referenced elsewhere.
const Timestamp = { now: () => ({}) } as any;
const auth = { currentUser: null as any };

export interface CRMContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'lead' | 'client';
  stage: string;
  avatar?: string;
  sequences?: string[];
  pipelineNote?: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContactNote {
  id: string;
  contactId: string;
  content: string;
  userId: string;
  createdAt: Timestamp;
}

export interface ContactFile {
  id: string;
  contactId: string;
  name: string;
  url: string;
  userId: string;
  createdAt: Timestamp;
}

class ContactService {
  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.uid;
  }

  // Contacts
  async getContacts(): Promise<CRMContact[]> {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, 'contacts'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CRMContact[];
  }

  async createContact(contactData: Omit<CRMContact, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const userId = this.getCurrentUserId();
    const now = Timestamp.now();
    
    const docRef = await addDoc(collection(db, 'contacts'), {
      ...contactData,
      userId,
      createdAt: now,
      updatedAt: now
    });
    
    return docRef.id;
  }

  async updateContact(id: string, updates: Partial<CRMContact>): Promise<void> {
    const userId = this.getCurrentUserId();
    const docRef = doc(db, 'contacts', id);
    
    // Verify ownership
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
      throw new Error('Contact not found or access denied');
    }
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  }

  async deleteContact(id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const docRef = doc(db, 'contacts', id);
    
    // Verify ownership
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
      throw new Error('Contact not found or access denied');
    }
    
    // Delete contact and all associated notes and files
    const batch = writeBatch(db);
    
    // Delete notes
    const notesQuery = query(
      collection(db, 'contactNotes'),
      where('contactId', '==', id),
      where('userId', '==', userId)
    );
    const notesSnapshot = await getDocs(notesQuery);
    notesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete files
    const filesQuery = query(
      collection(db, 'contactFiles'),
      where('contactId', '==', id),
      where('userId', '==', userId)
    );
    const filesSnapshot = await getDocs(filesQuery);
    filesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete contact
    batch.delete(docRef);
    
    await batch.commit();
  }

  // Notes
  async getContactNotes(contactId: string): Promise<ContactNote[]> {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, 'contactNotes'),
      where('contactId', '==', contactId),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ContactNote[];
  }

  async addContactNote(contactId: string, content: string): Promise<string> {
    const userId = this.getCurrentUserId();
    const now = Timestamp.now();
    
    const docRef = await addDoc(collection(db, 'contactNotes'), {
      contactId,
      content,
      userId,
      createdAt: now
    });
    
    return docRef.id;
  }

  async deleteContactNote(noteId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const docRef = doc(db, 'contactNotes', noteId);
    
    // Verify ownership
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
      throw new Error('Note not found or access denied');
    }
    
    await deleteDoc(docRef);
  }

  // Files
  async getContactFiles(contactId: string): Promise<ContactFile[]> {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, 'contactFiles'),
      where('contactId', '==', contactId),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ContactFile[];
  }

  async addContactFile(contactId: string, file: File): Promise<string> {
    const userId = this.getCurrentUserId();
    const now = Timestamp.now();
    
    // Upload file to Firebase Storage
    const fileName = `${userId}/${contactId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `contactFiles/${fileName}`);
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    // Save file metadata to Firestore
    const docRef = await addDoc(collection(db, 'contactFiles'), {
      contactId,
      name: file.name,
      url: downloadURL,
      userId,
      createdAt: now
    });
    
    return docRef.id;
  }

  async deleteContactFile(fileId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    const docRef = doc(db, 'contactFiles', fileId);
    
    // Verify ownership and get file data
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
      throw new Error('File not found or access denied');
    }
    
    const fileData = docSnap.data();
    
    // Delete from Firestore first
    await deleteDoc(docRef);
    
    // Try to delete from Storage (don't fail if storage delete fails)
    try {
      const storageRef = ref(storage, fileData.url);
      await deleteObject(storageRef);
    } catch (error) {
      console.warn('Failed to delete file from storage:', error);
    }
  }

  // Real-time listeners
  onContactsChange(callback: (contacts: CRMContact[]) => void): () => void {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, 'contacts'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const contacts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CRMContact[];
      callback(contacts);
    });
  }

  onContactNotesChange(contactId: string, callback: (notes: ContactNote[]) => void): () => void {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, 'contactNotes'),
      where('contactId', '==', contactId),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContactNote[];
      callback(notes);
    });
  }

  onContactFilesChange(contactId: string, callback: (files: ContactFile[]) => void): () => void {
    const userId = this.getCurrentUserId();
    const q = query(
      collection(db, 'contactFiles'),
      where('contactId', '==', contactId),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const files = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContactFile[];
      callback(files);
    });
  }
}

export const contactService = new ContactService();
