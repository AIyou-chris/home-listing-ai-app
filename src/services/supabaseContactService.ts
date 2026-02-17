import { supabase, Contact, ContactNote, ContactFile } from './supabase'

class SupabaseContactService {
  // Local storage fallback for unauthenticated/dev usage
  private localKey = {
    contacts: 'hlai_contacts',
    notes: 'hlai_contact_notes',
    files: 'hlai_contact_files'
  }

  private async getUser() {
    const { data } = await supabase.auth.getUser()
    return data.user || null
  }

  private readLocal<T>(key: string): T[] {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T[]) : []
    } catch {
      return []
    }
  }

  private writeLocal<T>(key: string, items: T[]) {
    localStorage.setItem(key, JSON.stringify(items))
  }

  // Contacts (Actually Leads in V2)
  async getContacts(): Promise<Contact[]> {
    const user = await this.getUser()
    if (!user) {
      return this.readLocal<Contact>(this.localKey.contacts)
    }

    const { data, error } = await supabase
      .from('leads')
      .select('*, stage:status, pipeline_note:notes')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async createContact(contactData: Omit<Contact, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<string> {
    const user = await this.getUser()
    if (!user) {
      const items = this.readLocal<Contact>(this.localKey.contacts)
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      items.unshift({
        id,
        user_id: 'local-dev',
        created_at: now,
        updated_at: now,
        ...contactData
      } as Contact)
      this.writeLocal(this.localKey.contacts, items)
      return id
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([{
        ...contactData,
        status: contactData.stage, // Map back to DB column
        notes: contactData.pipeline_note, // Map back to DB column
        user_id: user.id
      }])
      .select()
      .single()

    if (error) throw error
    return data.id
  }

  async updateContact(id: string, updates: Partial<Contact>): Promise<void> {
    const user = await this.getUser()
    if (!user) {
      const items = this.readLocal<Contact>(this.localKey.contacts)
      const idx = items.findIndex(c => c.id === id)
      if (idx >= 0) {
        items[idx] = { ...items[idx], ...updates, updated_at: new Date().toISOString() } as Contact
        this.writeLocal(this.localKey.contacts, items)
      }
      return
    }

    const payload: any = { ...updates, updated_at: new Date().toISOString() };
    if (updates.stage) payload.status = updates.stage;
    if (updates.pipeline_note) payload.notes = updates.pipeline_note;
    delete payload.stage;
    delete payload.pipeline_note;

    const { error } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
  }

  async deleteContact(id: string): Promise<void> {
    const user = await this.getUser()
    if (!user) {
      const items = this.readLocal<Contact>(this.localKey.contacts)
      this.writeLocal(this.localKey.contacts, items.filter(c => c.id !== id))
      return
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
  }

  // Notes
  async getContactNotes(contactId: string): Promise<ContactNote[]> {
    const user = await this.getUser()
    if (!user) {
      return this.readLocal<ContactNote>(this.localKey.notes).filter(n => n.contact_id === contactId)
    }

    const { data, error } = await supabase
      .from('contact_notes')
      .select('*')
      .eq('contact_id', contactId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async addContactNote(contactId: string, content: string): Promise<string> {
    const user = await this.getUser()
    if (!user) {
      const items = this.readLocal<ContactNote>(this.localKey.notes)
      const id = crypto.randomUUID()
      items.unshift({ id, contact_id: contactId, content, user_id: 'local-dev', created_at: new Date().toISOString() })
      this.writeLocal(this.localKey.notes, items)
      return id
    }

    const { data, error } = await supabase
      .from('contact_notes')
      .insert([{
        contact_id: contactId,
        content,
        user_id: user.id
      }])
      .select()
      .single()

    if (error) throw error
    return data.id
  }

  async deleteContactNote(noteId: string): Promise<void> {
    const user = await this.getUser()
    if (!user) {
      const items = this.readLocal<ContactNote>(this.localKey.notes)
      this.writeLocal(this.localKey.notes, items.filter(n => n.id !== noteId))
      return
    }

    const { error } = await supabase
      .from('contact_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', user.id)

    if (error) throw error
  }

  // Files
  async getContactFiles(contactId: string): Promise<ContactFile[]> {
    const user = await this.getUser()
    if (!user) {
      return this.readLocal<ContactFile>(this.localKey.files).filter(f => f.contact_id === contactId)
    }

    const { data, error } = await supabase
      .from('contact_files')
      .select('*')
      .eq('contact_id', contactId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async addContactFile(contactId: string, file: File): Promise<string> {
    const user = await this.getUser()
    if (!user) {
      const items = this.readLocal<ContactFile>(this.localKey.files)
      const id = crypto.randomUUID()
      const blobUrl = URL.createObjectURL(file)
      items.unshift({ id, contact_id: contactId, name: file.name, url: blobUrl, user_id: 'local-dev', created_at: new Date().toISOString() })
      this.writeLocal(this.localKey.files, items)
      return id
    }

    // Upload file to Supabase Storage
    const fileName = `${user.id}/${contactId}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('contact-files')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Get download URL
    const { data: urlData } = supabase.storage
      .from('contact-files')
      .getPublicUrl(fileName)

    // Save file metadata to database
    const { data, error } = await supabase
      .from('contact_files')
      .insert([{
        contact_id: contactId,
        name: file.name,
        url: urlData.publicUrl,
        user_id: user.id
      }])
      .select()
      .single()

    if (error) throw error
    return data.id
  }

  async deleteContactFile(fileId: string): Promise<void> {
    const user = await this.getUser()
    if (!user) {
      const items = this.readLocal<ContactFile>(this.localKey.files)
      this.writeLocal(this.localKey.files, items.filter(f => f.id !== fileId))
      return
    }

    // Get file data first
    const { data: fileData, error: fetchError } = await supabase
      .from('contact_files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) throw fetchError

    // Delete from database
    const { error: deleteError } = await supabase
      .from('contact_files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', user.id)

    if (deleteError) throw deleteError

    // Try to delete from storage (don't fail if storage delete fails)
    try {
      const fileName = fileData.url.split('/').pop()
      if (fileName) {
        await supabase.storage
          .from('contact-files')
          .remove([fileName])
      }
    } catch (error) {
      console.warn('Failed to delete file from storage:', error)
    }
  }

  // Real-time listeners
  async onContactsChange(callback: (contacts: Contact[]) => void) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // Fallback: listen to storage changes
      const handler = () => callback(this.readLocal<Contact>(this.localKey.contacts))
      window.addEventListener('storage', handler)
      // Initial
      callback(this.readLocal<Contact>(this.localKey.contacts))
      return () => window.removeEventListener('storage', handler)
    }

    return supabase
      .channel('contacts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contacts',
        filter: `user_id=eq.${user.id}`
      }, () => {
        this.getContacts().then(callback)
      })
      .subscribe()
  }

  async onContactNotesChange(contactId: string, callback: (notes: ContactNote[]) => void) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return () => { }

    return supabase
      .channel(`notes-${contactId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contact_notes',
        filter: `contact_id=eq.${contactId}`
      }, () => {
        this.getContactNotes(contactId).then(callback)
      })
      .subscribe()
  }

  async onContactFilesChange(contactId: string, callback: (files: ContactFile[]) => void) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return () => { }

    return supabase
      .channel(`files-${contactId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contact_files',
        filter: `contact_id=eq.${contactId}`
      }, () => {
        this.getContactFiles(contactId).then(callback)
      })
      .subscribe()
  }
}

export const supabaseContactService = new SupabaseContactService()
