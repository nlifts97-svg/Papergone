'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import styles from './dashboard.module.css'

const TYPE_COLORS = {
  receipt: { bg: '#e8f5ee', color: '#1a7a4a' },
  bill: { bg: '#fdf3e3', color: '#92600a' },
  invoice: { bg: '#eaf0fb', color: '#1a4a8a' },
  contract: { bg: '#eeedfe', color: '#3c3489' },
  warranty: { bg: '#e8f5ee', color: '#1a7a4a' },
  id: { bg: '#fdf0ee', color: '#c0392b' },
  medical: { bg: '#fdf0ee', color: '#c0392b' },
  tax: { bg: '#fdf3e3', color: '#92600a' },
  insurance: { bg: '#eaf0fb', color: '#1a4a8a' },
  note: { bg: '#f1efe8', color: '#444441' },
  other: { bg: '#f1efe8', color: '#444441' },
}

const TYPE_EMOJI = {
  receipt: '🧾', bill: '⚡', invoice: '📋', contract: '📄',
  warranty: '🛡️', id: '🪪', medical: '🏥', tax: '📊',
  insurance: '🛡️', note: '📝', other: '📄'
}

const ALL_TYPES = ['receipt','bill','invoice','contract','warranty','id','medical','tax','insurance','note','other']

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [docs, setDocs] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [dragging, setDragging] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Scan popup
  const [scanPopup, setScanPopup] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editType, setEditType] = useState('')
  const [editFolder, setEditFolder] = useState('')
  const [editReminder, setEditReminder] = useState('')
  const [editFields, setEditFields] = useState([])
  const [savingDoc, setSavingDoc] = useState(false)

  // Share popup
  const [showShare, setShowShare] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareGroupName, setShareGroupName] = useState('')
  const [shareDocId, setShareDocId] = useState(null)

  // Chat
  const [showChat, setShowChat] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hi! I can answer questions about your documents. Try asking: "How much do I owe this month?" or "When does my warranty expire?"' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  const fileRef = useRef()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      loadDocs()
      loadGroups(user.id)
    })
  }, [])

  useEffect(() => {
    if (showChat) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, showChat])

  async function loadDocs() {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  async function loadGroups(userId) {
    const { data } = await supabase.from('groups').select('*').eq('owner_id', userId)
    setGroups(data || [])
  }

  async function handleFiles(files) {
    for (const file of Array.from(files)) {
      await processFile(file)
    }
  }

  async function processFile(file) {
    // Paywall check
    const plan = profile?.plan || 'starter'
    if (plan === 'starter' && docs.length >= 20) {
      if (confirm('You reached the 20 doc limit. Upgrade to Pro?')) router.push('/pricing')
      return
    }

    setUploading(true)
    setUploadProgress('Reading document...')

    try {
      const base64 = await toBase64(file)
      const mediaType = file.type || 'image/jpeg'
      setUploadProgress('Preparing document...')

      let aiData = { type: 'other', title: '', summary: '', fields: [], folder: 'Other', reminder: null, tags: [], defaultFields: {}, defaultFolders: {} }
      try {
        const scanRes = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaType })
        })
        if (scanRes.ok) aiData = await scanRes.json()
      } catch (e) { console.log('AI scan failed') }

      setUploading(false)
      setUploadProgress('')

      // Show popup to review/edit
      setPendingFile({ file, base64, mediaType })
      setEditTitle(aiData.title || file.name)
      setEditType(aiData.type || 'other')
      setEditFolder(aiData.folder || 'Other')
      setEditReminder(aiData.reminder || '')
      setEditFields(aiData.fields?.length ? aiData.fields : [{ key: '', value: '' }])
      setScanPopup(aiData)

    } catch (e) {
      setUploading(false)
      setUploadProgress('')
      alert('Error: ' + e.message)
    }
  }

  async function saveDocument() {
    if (!pendingFile) return
    setSavingDoc(true)

    let imageUrl = null
    try {
      const fileName = `${user.id}/${Date.now()}_${pendingFile.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { data: storageData } = await supabase.storage.from('documents').upload(fileName, pendingFile.file, { upsert: true })
      if (storageData) {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)
        imageUrl = urlData.publicUrl
      }
    } catch (e) { console.log('Storage failed') }

    const cleanFields = editFields.filter(f => f.key && f.value)

    const { data: doc, error } = await supabase.from('documents').insert({
      user_id: user.id,
      type: editType,
      title: editTitle,
      summary: scanPopup?.summary || '',
      fields: cleanFields,
      folder: editFolder,
      reminder: editReminder || null,
      tags: scanPopup?.tags || [],
      image_url: imageUrl,
    }).select().single()

    if (error) alert('Error saving: ' + error.message)
    else if (doc) setDocs(prev => [doc, ...prev])

    setSavingDoc(false)
    setScanPopup(null)
    setPendingFile(null)
  }

  function addField() {
    setEditFields(prev => [...prev, { key: '', value: '' }])
  }

  function updateField(i, key, value) {
    setEditFields(prev => prev.map((f, idx) => idx === i ? { ...f, [key]: value } : f))
  }

  function removeField(i) {
    setEditFields(prev => prev.filter((_, idx) => idx !== i))
  }

  function toBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result.split(',')[1])
      r.onerror = () => rej(new Error('Read failed'))
      r.readAsDataURL(file)
    })
  }

  async function deleteDoc(id) {
    await supabase.from('documents').delete().eq('id', id)
    setDocs(prev => prev.filter(d => d.id !== id))
    if (selectedDoc?.id === id) setSelectedDoc(null)
  }

  async function createGroupAndShare() {
    if (!shareGroupName || !shareEmail) { alert('Please fill in both fields.'); return }
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: shareDocId, groupName: shareGroupName, inviteEmail: shareEmail, userId: user.id })
    })
    const data = await res.json()
    if (data.error) { alert(data.error); return }
    alert('Document shared with ' + shareEmail + '!')
    setShowShare(false)
    setShareEmail('')
    setShareGroupName('')
    setShareDocId(null)
    loadGroups(user.id)
  }

  async function sendChat() {
    setChatMessages(prev => [...prev, { role: "assistant", text: "AI assistant is coming soon! 🚀 We are working on it." }])
    setChatInput("")
    return
    if (!chatInput.trim() || chatLoading) return
    const msg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: msg }])
    setChatLoading(true)

    const docsContext = docs.slice(0, 30).map(d =>
      `${d.title} (${d.type}) - ${d.summary} - Fields: ${JSON.stringify(d.fields)} - Reminder: ${d.reminder || 'none'} - Folder: ${d.folder}`
    ).join('\n')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, docsContext })
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', text: data.reply || 'Sorry, I could not answer that.' }])
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Something went wrong. Try again.' }])
    }
    setChatLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const filtered = docs.filter(d => {
    const matchFilter = filter === 'all' || d.type === filter
    const matchSearch = !search ||
      d.title?.toLowerCase().includes(search.toLowerCase()) ||
      d.summary?.toLowerCase().includes(search.toLowerCase()) ||
      d.folder?.toLowerCase().includes(search.toLowerCase()) ||
      d.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
    return matchFilter && matchSearch
  })

  const folders = [...new Set(docs.map(d => d.folder).filter(Boolean))]
  const upcomingReminders = docs.filter(d => d.reminder)
  const planLabel = profile?.plan || 'starter'

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>Paper<span>Gone</span></div>
          <div className={styles.planBadge}>{planLabel}</div>
          <button className={styles.uploadBtn} onClick={() => fileRef.current.click()}>+ Upload document</button>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSection}>Documents</div>
          <button className={`${styles.navItem} ${filter === 'all' ? styles.navActive : ''}`} onClick={() => { setFilter('all'); setSidebarOpen(false) }}>
            <span>📁</span> All documents <span className={styles.navCount}>{docs.length}</span>
          </button>
          {ALL_TYPES.map(type => {
            const count = docs.filter(d => d.type === type).length
            if (count === 0) return null
            return (
              <button key={type} className={`${styles.navItem} ${filter === type ? styles.navActive : ''}`} onClick={() => { setFilter(type); setSidebarOpen(false) }}>
                <span>{TYPE_EMOJI[type]}</span>
                {type.charAt(0).toUpperCase() + type.slice(1)}s
                <span className={styles.navCount}>{count}</span>
              </button>
            )
          })}
        </nav>

        {folders.length > 0 && (
          <nav className={styles.nav}>
            <div className={styles.navSection}>Smart folders</div>
            {folders.map(f => (
              <button key={f} className={styles.navItem} onClick={() => { setSearch(f); setSidebarOpen(false) }}>
                <span>📂</span><span className={styles.folderName}>{f}</span>
              </button>
            ))}
          </nav>
        )}

        {upcomingReminders.length > 0 && (
          <nav className={styles.nav}>
            <div className={styles.navSection}>Reminders</div>
            {upcomingReminders.slice(0, 5).map(d => (
              <div key={d.id} className={styles.reminderItem} onClick={() => setSelectedDoc(d)}>
                <span>🔔</span>
                <div>
                  <div className={styles.reminderTitle}>{d.title}</div>
                  <div className={styles.reminderText}>{d.reminder}</div>
                </div>
              </div>
            ))}
          </nav>
        )}

        <div className={styles.sidebarBottom}>
          <button className={styles.chatBtn} onClick={() => { setShowChat(true); setChatMessages([{ role: "assistant", text: "🚀 AI Assistant coming soon! Once launched, you can ask things like: How much do I owe this month? When does my warranty expire? Show me all unpaid bills." }]) }}>💬 Ask AI assistant</button>
          <button className={styles.upgradeBtn} onClick={() => alert('💳 Payments coming soon! We are setting up secure payments. Stay tuned.')}>⚡ Upgrade plan</button>
          <button className={styles.signOutBtn} onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input className={styles.search} placeholder='Search documents, folders, tags...' value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className={styles.headerRight}>
            <span className={styles.userEmail}>{user?.email}</span>
          </div>
        </header>

        <div className={styles.content}>
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />

          <div
            className={`${styles.dropZone} ${dragging ? styles.dragging : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
            onClick={() => fileRef.current.click()}
          >
            {uploading ? (
              <div className={styles.uploadingState}>
                <div className={styles.spinner}></div>
                <span>{uploadProgress}</span>
              </div>
            ) : (
              <>
                <div className={styles.dropIcon}>📎</div>
                <div className={styles.dropTitle}>Drop documents here or click to upload</div>
                <div className={styles.dropSub}>AI reads and organizes everything automatically</div>
              </>
            )}
          </div>

          {loading ? (
            <div className={styles.loadingState}>Loading your documents...</div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📭</div>
              <div className={styles.emptyTitle}>{search ? 'No results found' : 'No documents yet'}</div>
              <div className={styles.emptySub}>{search ? 'Try a different search' : 'Upload your first document above'}</div>
            </div>
          ) : (
            <div className={styles.docsGrid}>
              {filtered.map(doc => (
                <div key={doc.id} className={`${styles.docCard} ${selectedDoc?.id === doc.id ? styles.docSelected : ''}`} onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}>
                  <div className={styles.docTop}>
                    <div className={styles.docEmoji}>{TYPE_EMOJI[doc.type] || '📄'}</div>
                    <div className={styles.docInfo}>
                      <div className={styles.docTitle}>{doc.title}</div>
                      <div className={styles.docSummary}>{doc.summary}</div>
                    </div>
                    <div className={styles.docBadge} style={TYPE_COLORS[doc.type] || TYPE_COLORS.other}>{doc.type}</div>
                  </div>
                  {doc.folder && <div className={styles.docFolder}>📂 {doc.folder}</div>}
                  {doc.reminder && <div className={styles.docReminder}>🔔 {doc.reminder}</div>}
                  {selectedDoc?.id === doc.id && (
                    <div className={styles.docDetails}>
                      {doc.fields?.map((f, i) => (
                        <div key={i} className={styles.detailRow}>
                          <span className={styles.detailKey}>{f.key}</span>
                          <span className={styles.detailVal}>{f.value}</span>
                        </div>
                      ))}
                      {doc.tags?.length > 0 && (
                        <div className={styles.tags}>{doc.tags.map((t, i) => <span key={i} className={styles.tag}>{t}</span>)}</div>
                      )}
                      {doc.image_url && <a href={doc.image_url} target="_blank" rel="noopener noreferrer" className={styles.viewOriginal}>View original →</a>}
                      <div className={styles.docActions}>
                        <button className={styles.shareBtn} onClick={e => { e.stopPropagation(); setShareDocId(doc.id); setShowShare(true) }}>Share</button>
                        <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); deleteDoc(doc.id) }}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* SCAN POPUP */}
      {scanPopup && (
        <div className={styles.modalOverlay}>
          <div className={styles.scanModal}>
            <div className={styles.scanHeader}>
              <div className={styles.scanTitle}>Review your document</div>
              <div className={styles.scanSub}>AI detected this info — confirm or edit before saving</div>
            </div>

            <div className={styles.scanBody}>
              <div className={styles.scanRow}>
                <div className={styles.scanField}>
                  <label className={styles.scanLabel}>Document type</label>
                  <select className={styles.scanInput} value={editType} onChange={e => { setEditType(e.target.value); setEditFolder(scanPopup?.defaultFolders?.[e.target.value] || e.target.value); setEditFields(scanPopup?.defaultFields?.[e.target.value] || [{ key: '', value: '' }]) }}>
                    {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_EMOJI[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div className={styles.scanField}>
                  <label className={styles.scanLabel}>Save to folder</label>
                  <input className={styles.scanInput} value={editFolder} onChange={e => setEditFolder(e.target.value)} placeholder="e.g. Bills/Energy" />
                </div>
              </div>

              <div className={styles.scanField}>
                <label className={styles.scanLabel}>Title</label>
                <input className={styles.scanInput} value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Document title" />
              </div>

              <div className={styles.scanField}>
                <label className={styles.scanLabel}>Reminder (optional)</label>
                <input className={styles.scanInput} value={editReminder} onChange={e => setEditReminder(e.target.value)} placeholder="e.g. Pay by June 15" />
              </div>

              <div className={styles.scanField}>
                <div className={styles.fieldsHeader}>
                  <label className={styles.scanLabel}>Extracted information</label>
                  <button className={styles.addFieldBtn} onClick={addField}>+ Add field</button>
                </div>
                <div className={styles.fieldsList}>
                  {editFields.map((f, i) => (
                    <div key={i} className={styles.fieldRow}>
                      <input className={styles.fieldInput} placeholder="Field name" value={f.key} onChange={e => updateField(i, 'key', e.target.value)} />
                      <input className={styles.fieldInput} placeholder="Value" value={f.value} onChange={e => updateField(i, 'value', e.target.value)} />
                      <button className={styles.removeField} onClick={() => removeField(i)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.scanFooter}>
              <button className={styles.scanDiscard} onClick={() => { setScanPopup(null); setPendingFile(null) }}>Discard</button>
              <button className={styles.scanSave} onClick={saveDocument} disabled={savingDoc}>
                {savingDoc ? 'Saving...' : 'Save document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE POPUP */}
      {showShare && (
        <div className={styles.modalOverlay} onClick={() => setShowShare(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Share document</h2>
            <p className={styles.modalSub}>Create a shared space and invite someone by email</p>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Space name (e.g. "Apartment bills")</label>
              <input className={styles.modalInput} placeholder="Apartment bills" value={shareGroupName} onChange={e => setShareGroupName(e.target.value)} />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Invite by email</label>
              <input className={styles.modalInput} type="email" placeholder="friend@example.com" value={shareEmail} onChange={e => setShareEmail(e.target.value)} />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowShare(false)}>Cancel</button>
              <button className={styles.modalConfirm} onClick={createGroupAndShare}>Share</button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT */}
      {showChat && (
        <div className={styles.chatOverlay}>
          <div className={styles.chatBox}>
            <div className={styles.chatHeader}>
              <div className={styles.chatTitle}>💬 AI Assistant</div>
              <button className={styles.chatClose} onClick={() => setShowChat(false)}>✕</button>
            </div>
            <div className={styles.chatMessages}>
              {chatMessages.map((m, i) => (
                <div key={i} className={`${styles.chatMsg} ${m.role === 'user' ? styles.chatUser : styles.chatBot}`}>
                  {m.text}
                </div>
              ))}
              {chatLoading && <div className={`${styles.chatMsg} ${styles.chatBot}`}>Thinking...</div>}
              <div ref={chatEndRef} />
            </div>
            <div className={styles.chatInputRow}>
              <input
                className={styles.chatInput}
                placeholder="Ask about your documents..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
              />
              <button className={styles.chatSend} onClick={sendChat}>→</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
