import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Search, Library, Clock, Settings, BookOpen,
  X, Trash2, Maximize2, ChevronRight, ChevronLeft, ChevronUp,
  Moon, Sun, ZoomIn, ZoomOut, Download, AlertCircle
} from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import { useInView } from 'react-intersection-observer'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Optimized Worker for stability
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface Book {
  id: string
  title: string
  author: string
  path: string
  cover: string
  progress: number
  lastRead: number
  format: 'pdf' | 'epub'
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'linear-gradient(135deg, #2d1b33 0%, #4a1942 100%)',
  'linear-gradient(135deg, #0e1a2a 0%, #1a3050 100%)',
]

export default function App() {
  const [view, setView] = useState<'library' | 'reader'>('library')
  const [books, setBooks] = useState<Book[]>([])
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [search, setSearch] = useState('')
  const [activeNav, setActiveNav] = useState<'library' | 'recent'>('library')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lumina-books-v4')
      if (saved) setBooks(JSON.parse(saved))
    } catch { setBooks([]) }
  }, [])

  useEffect(() => {
    localStorage.setItem('lumina-books-v4', JSON.stringify(books))
  }, [books])

  const addBook = async () => {
    try {
      // @ts-ignore
      const filePath = await window.api?.openFileDialog()
      if (!filePath) return
      const name = filePath.split(/[\\/]/).pop() ?? 'Untitled'
      const title = name.replace(/\.(pdf|epub)$/i, '')
      const book: Book = {
        id: Date.now().toString(36),
        title,
        author: 'Refined Manuscript',
        path: filePath,
        cover: COVER_GRADIENTS[Math.floor(Math.random() * COVER_GRADIENTS.length)],
        progress: 0,
        lastRead: Date.now(),
        format: filePath.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf'
      }
      setBooks(prev => [book, ...prev])
    } catch (err) { console.error(err) }
  }

  const removeBook = (id: string, e: any) => {
    e.stopPropagation()
    setBooks(prev => prev.filter(b => b.id !== id))
  }

  const openBook = (book: Book) => {
    setSelectedBook(book)
    setBooks(prev => prev.map(b => b.id === book.id ? { ...b, lastRead: Date.now() } : b))
    setView('reader')
  }

  const filteredBooks = books
    .filter(b => b.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => activeNav === 'recent' ? b.lastRead - a.lastRead : 0)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">L</div>
          <span className="sidebar-logo-text">Lumina</span>
        </div>
        <div className="sidebar-section-label">Vault</div>
        <NavBtn icon={<Library size={17} />} label="Library" active={view === 'library' && activeNav === 'library'} onClick={() => {setView('library'); setActiveNav('library')}} />
        <NavBtn icon={<Clock size={17} />} label="Recent" active={view === 'library' && activeNav === 'recent'} onClick={() => {setView('library'); setActiveNav('recent')}} />
        <div className="sidebar-spacer" />
        <button className="add-book-btn" onClick={addBook}><Plus size={16} /> Load Book</button>
      </aside>

      <main className="main-content">
        <AnimatePresence mode="wait">
          {view === 'library' ? (
            <motion.div key="lib" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="library-view">
              <div className="library-header">
                <div>
                  <h1 className="library-title">{activeNav === 'library' ? 'The Archive' : 'Recent Reads'}</h1>
                  <p className="library-subtitle">{books.length} VOLUMES COLLECTED</p>
                </div>
                <div className="search-wrap">
                  <Search className="search-icon" size={15} />
                  <input className="search-input" placeholder="Query collection..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
              {books.length === 0 ? <EmptyState onAdd={addBook} /> : (
                <div className="book-grid">
                  {filteredBooks.map((b, i) => (
                    <motion.div key={b.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <BookCard book={b} onClick={() => openBook(b)} onDelete={e => removeBook(b.id, e)} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <ReaderView key="read" book={selectedBook} onBack={() => {setView('library'); setSelectedBook(null)}} />
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function NavBtn({ icon, label, active, onClick }: any) {
  return (
    <button className={`nav-btn ${active ? 'active' : ''}`} onClick={onClick}>
      {icon} {label}
      {active && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: 'white' }} />}
    </button>
  )
}

function BookCard({ book, onClick, onDelete }: any) {
  return (
    <div className="book-item" onClick={onClick}>
      <div className="book-cover-wrap">
        <div style={{ position: 'absolute', inset: 0, background: book.cover, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <span style={{ fontFamily: 'var(--f-serif)', fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>{book.title}</span>
        </div>
        <div className="book-cover-overlay" />
        <button className="book-delete-btn" onClick={onDelete}><Trash2 size={13} /></button>
        <div className="book-format-badge">{book.format.toUpperCase()}</div>
      </div>
      <div className="book-title">{book.title}</div>
      <div className="book-author">Lumina Edition</div>
    </div>
  )
}

function EmptyState({ onAdd }: any) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><BookOpen size={30} /></div>
      <h3 className="empty-state-title">No manuscripts found</h3>
      <p className="empty-state-desc">Your personal vault is currently empty. Initialize by adding a PDF or EPUB.</p>
      <button className="add-book-btn" style={{ marginTop: 20, width: 'auto', padding: '10px 24px' }} onClick={onAdd}>Add Manuscript</button>
    </div>
  )
}

function ReaderView({ book, onBack }: { book: Book | null; onBack: () => void }) {
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.1)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!book) return null

  const fileUrl = useMemo(() => `file:///${book.path.replace(/\\/g, '/').replace(/ /g, '%20')}`, [book.path])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="reader-shell" style={{ background: isDarkMode ? '#050505' : '#FCFCFC' }}>
      
      {/* Floating Oasis Controls — Top Left */}
      <div style={{ position: 'fixed', top: 30, left: 30, zIndex: 1000, display: 'flex', gap: 12 }}>
        <button className="oasis-btn glass" onClick={onBack} title="Exit View">
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Floating Oasis Controls — Top Right */}
      <div style={{ position: 'fixed', top: 30, right: 30, zIndex: 1000, display: 'flex', gap: 12 }}>
        <button className="oasis-btn glass" onClick={() => setScale(s => Math.min(s + 0.2, 3))}><ZoomIn size={18} /></button>
        <button className="oasis-btn glass" onClick={() => setScale(s => Math.max(s - 0.2, 0.5))}><ZoomOut size={18} /></button>
        <button className="oasis-btn glass" onClick={() => setIsDarkMode(!isDarkMode)}>
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div ref={scrollRef} className="reader-body" style={{ overflowY: 'auto', flex: 1, padding: '100px 0', scrollBehavior: 'smooth' }}>
        {error ? (
          <div style={{ height: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ff4444' }}>
            <AlertCircle size={40} />
            <p style={{ marginTop: 10 }}>Manuscript Offline</p>
          </div>
        ) : (
          <Document file={fileUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)} onLoadError={(e) => setError(e.message)}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 60 }}>
              {Array.from({ length: numPages }, (_, i) => (
                <LazyPage key={i} pageNumber={i + 1} scale={scale} isDarkMode={isDarkMode} />
              ))}
            </div>
          </Document>
        )}
      </div>

      {/* Subtle Progress Indicator */}
      <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 1000 }}>
        <button className="oasis-btn glass" onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} title="Return to Start">
          <ChevronUp size={20} />
        </button>
      </div>

      <style>{`
        .reader-body::-webkit-scrollbar { width: 4px; }
        .reader-body::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.1); border-radius: 10px; }
        .dark-pdf canvas { filter: invert(1) hue-rotate(180deg) brightness(0.85) contrast(1.1) !important; }
        
        .oasis-btn {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'};
          background: ${isDarkMode ? 'rgba(25,25,25,0.4)' : 'rgba(255,255,255,0.4)'};
          border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
          backdrop-filter: blur(20px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .oasis-btn:hover {
          background: ${isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)'};
          color: ${isDarkMode ? 'white' : 'black'};
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
      `}</style>
    </motion.div>
  )
}


function LazyPage({ pageNumber, scale, isDarkMode }: any) {
  const { ref, inView } = useInView({
    triggerOnce: false,
    rootMargin: '1000px 0px', // Pre-load pages seen soon
  })

  // Fixed aspect ratio placeholders to prevent layout shift
  return (
    <div ref={ref} style={{ minHeight: inView ? 'auto' : `${800 * scale}px`, width: '100%', display: 'flex', justifyContent: 'center', transition: 'opacity 0.5s' }}>
      {inView ? (
        <div className={`pdf-canvas-container ${isDarkMode ? 'dark-pdf' : ''}`} style={{ transition: 'all 0.5s' }}>
          <Page 
            pageNumber={pageNumber} 
            scale={scale} 
            renderTextLayer={true} 
            renderAnnotationLayer={true} 
            loading={<div style={{ height: 800 * scale, width: 600 * scale, background: 'rgba(255,255,255,0.02)', borderRadius: 4 }} />}
          />
        </div>
      ) : (
        <div style={{ height: 800 * scale, width: 600 * scale, background: 'rgba(255,255,255,0.01)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 10, color: '#333', letterSpacing: '0.2em' }}>PAGE {pageNumber}</p>
        </div>
      )}
    </div>
  )
}
