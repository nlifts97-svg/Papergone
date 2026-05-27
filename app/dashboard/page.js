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

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [docs, setDocs] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showShare, setShowShare] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareGroupName, setShareGroupName] = useState('')
  const [shareDocId, setShareDocId] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)
      loadDocs(user.id)
      loadGroups(user.id)
    })
  }, [])

  async function loadDocs(userId) {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  async function loadGroups(userId) {
    const { data } = await supabase
      .from('groups')
      .select('*')
      .eq('owner_id', userId)
    setGroups(data || [])
  }

  async function handleFiles(files) {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') continue
      await processFile(file)
    }
  }

  async function processFile(file) {
    setUploading(true)
    setUploadProgress('Reading document...')

    try {
      const base64 = await toBase64(file)
      const mediaType = file.type || 'image/jpeg'

      setUploadProgress('AI is analyzing...')

      let aiData = { type: 'other', title: file.name, summary: '', fields: [], folder: 'Other', reminder: null, tags: [] }
      try {
        const scanRes = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mediaType })
        })
        if (scanRes.ok) aiData = await scanRes.json()
      } catch (e) {
        console.log('AI scan failed, saving without AI data')
      }

      setUploadProgress('Saving to your archive...')

      // Try to upload to storage, but continue even if it fails
      let imageUrl = null
      try {
        const fileName = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { data: storageData, error: storageError } = await supabase.storage
          .from('documents')
          .upload(fileName, file, { upsert: true })
        if (storageData && !storageError) {
          const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName)
          imageUrl = urlData.publicUrl
        }
      } catch (e) {
        console.log('Storage upload failed, continuing without image')
      }

      const { data: doc, error: insertError } = await supabase.from('documents').insert({
        user_id: user.id,
        type: aiData.type || 'other',
        title: aiData.title || file.name,
        summary: aiData.summary || '',
        fields: aiData.fields || [],
        folder: aiData.folder || 'Other',
        reminder: aiData.reminder || null,
        tags: aiData.tags || [],
        image_url: imageUrl,
      }).select().single()

      if (insertError) {
        console.error('Insert error:', insertError)
        alert('Error saving document: ' + insertError.message)
      } else if (doc) {
        setDocs(prev => [doc, ...prev])
      }
    } catch (e) {
      console.error('Process file error:', e)
      alert('Something went wrong: ' + e.message)
    }

    setUploading(false)
    setUploadProgress('')
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
    if (!shareGroupName || !shareEmail) return
    const { data: group } = await supabase.from('groups').insert({
      name: shareGroupName,
      owner_id: user.id
    }).select().single()

    if (group) {
      await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: shareDocId,
          groupId: group.id,
          inviteEmail: shareEmail,
          userId: user.id
        })
      })
      setGroups(prev => [...prev, group])
    }
    setShowShare(false)
    setShareEmail('')
    setShareGroupName('')
    setShareDocId(null)
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

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>Paper<span>Gone</span></div>
          <button className={styles.uploadBtn} onClick={() => fileRef.current.click()}>
            + Upload
          </button>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSection}>Documents</div>
          {['all','receipt','bill','invoice','contract','warranty','id','medical','tax','other'].map(type => (
            <button
              key={type}
              className={`${styles.navItem} ${filter === type ? styles.navActive : ''}`}
              onClick={() => { setFilter(type); setSidebarOpen(false) }}
            >
              <span>{type === 'all' ? '📁' : TYPE_EMOJI[type]}</span>
              {type === 'all' ? 'All documents' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
              {type === 'all' && <span className={styles.navCount}>{docs.length}</span>}
            </button>
          ))}
        </nav>

        {folders.length > 0 && (
          <nav className={styles.nav}>
            <div className={styles.navSection}>Smart folders</div>
            {folders.map(f => (
              <button
                key={f}
                className={styles.navItem}
                onClick={() => { setSearch(f); setSidebarOpen(false) }}
              >
                <span>📂</span>
                <span className={styles.folderName}>{f}</span>
              </button>
            ))}
          </nav>
        )}

        <div className={styles.sidebarBottom}>
          <button className={styles.signOutBtn} onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.search}
              placeholder='Search documents...'
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.headerRight}>
            <span className={styles.userEmail}>{user?.email}</span>
          </div>
        </header>

        <div className={styles.content}>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />

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
                <div className={styles.dropSub}>Receipts, bills, contracts, warranties, IDs — any document</div>
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
                <div
                  key={doc.id}
                  className={`${styles.docCard} ${selectedDoc?.id === doc.id ? styles.docSelected : ''}`}
                  onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                >
                  <div className={styles.docTop}>
                    <div className={styles.docEmoji}>{TYPE_EMOJI[doc.type] || '📄'}</div>
                    <div className={styles.docInfo}>
                      <div className={styles.docTitle}>{doc.title}</div>
                      <div className={styles.docSummary}>{doc.summary}</div>
                    </div>
                    <div
                      className={styles.docBadge}
                      style={TYPE_COLORS[doc.type] || TYPE_COLORS.other}
                    >
                      {doc.type}
                    </div>
                  </div>

                  {doc.folder && (
                    <div className={styles.docFolder}>📂 {doc.folder}</div>
                  )}

                  {doc.reminder && (
                    <div className={styles.docReminder}>🔔 {doc.reminder}</div>
                  )}

                  {selectedDoc?.id === doc.id && (
                    <div className={styles.docDetails}>
                      {doc.fields?.map((f, i) => (
                        <div key={i} className={styles.detailRow}>
                          <span className={styles.detailKey}>{f.key}</span>
                          <span className={styles.detailVal}>{f.value}</span>
                        </div>
                      ))}
                      {doc.tags?.length > 0 && (
                        <div className={styles.tags}>
                          {doc.tags.map((t, i) => (
                            <span key={i} className={styles.tag}>{t}</span>
                          ))}
                        </div>
                      )}
                      {doc.image_url && (
                        <a href={doc.image_url} target="_blank" rel="noopener noreferrer" className={styles.viewOriginal}>
                          View original →
                        </a>
                      )}
                      <div className={styles.docActions}>
                        <button
                          className={styles.shareBtn}
                          onClick={e => { e.stopPropagation(); setShareDocId(doc.id); setShowShare(true) }}
                        >
                          Share
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={e => { e.stopPropagation(); deleteDoc(doc.id) }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showShare && (
        <div className={styles.modalOverlay} onClick={() => setShowShare(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Share document</h2>
            <p className={styles.modalSub}>Create a shared space and invite someone by email</p>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Space name (e.g. "Apartment bills")</label>
              <input
                className={styles.modalInput}
                placeholder="Apartment bills"
                value={shareGroupName}
                onChange={e => setShareGroupName(e.target.value)}
              />
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>Invite by email</label>
              <input
                className={styles.modalInput}
                type="email"
                placeholder="friend@example.com"
                value={shareEmail}
                onChange={e => setShareEmail(e.target.value)}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowShare(false)}>Cancel</button>
              <button className={styles.modalConfirm} onClick={createGroupAndShare}>Share</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
