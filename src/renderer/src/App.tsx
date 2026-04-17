import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Search, Library, Clock, Settings, BookOpen,
  X, Trash2, Maximize2, ChevronRight, ChevronLeft, ChevronUp,
  Moon, Sun, ZoomIn, ZoomOut, Download, AlertCircle, Menu, List
} from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import { useInView } from 'react-intersection-observer'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import Epub, { Rendition } from 'epubjs'


// Optimized Worker for stability
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface Book {
  id: string
  title: string
  author: string
  path: string
  cover: string
  format: 'pdf' | 'epub'
  currentPage?: number
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'linear-gradient(135deg, #2d1b33 0%, #4a1942 100%)',
  'linear-gradient(135deg, #0e1a2a 0%, #1a3050 100%)',
]

type Theme = 'dark' | 'grayish' | 'light'


export default function App() {
  const [view, setView] = useState<'library' | 'reader'>('library')
  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const saved = localStorage.getItem('lumina-books-v5')
      if (saved) return JSON.parse(saved)
      // Migration from v4
      const v4 = localStorage.getItem('lumina-books-v4')
      if (v4) return JSON.parse(v4)
      return []
    } catch { return [] }
  })
  const [selectedBook, setSelectedBook] = useState<Book | null>(() => {
    try {
      const lastId = localStorage.getItem('lumina-last-book')
      if (lastId) {
        const saved = localStorage.getItem('lumina-books-v5')
        if (saved) {
          const all: Book[] = JSON.parse(saved)
          return all.find(b => b.id === lastId) || null
        }
      }
    } catch {}
    return null
  })
  const [search, setSearch] = useState('')
  const [activeNav, setActiveNav] = useState<'library' | 'recent'>('library')

  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('lumina-theme') as Theme) || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('lumina-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('lumina-books-v5', JSON.stringify(books))
  }, [books])

  useEffect(() => {
    if (selectedBook) {
      localStorage.setItem('lumina-last-book', selectedBook.id)
    }
  }, [selectedBook])

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
    localStorage.setItem('lumina-last-book', book.id)
  }

  const filteredBooks = books
    .filter(b => b.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => activeNav === 'recent' ? b.lastRead - a.lastRead : 0)

  const updateBookProgress = (bookId: string, page: number) => {
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, currentPage: page } : b))
  }

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
            <ReaderView 
              key="read" 
              book={selectedBook} 
              theme={theme}
              onThemeChange={setTheme}
              onBack={() => {setView('library'); setSelectedBook(null)}} 
              onPageChange={(p) => selectedBook && updateBookProgress(selectedBook.id, p)}
            />
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
        <div style={{ position: 'absolute', inset: 0, background: book.cover, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 }}>
          <div style={{ opacity: 0.2 }}><BookOpen size={40} /></div>
          <span style={{ fontFamily: 'var(--f-serif)', fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontWeight: 500 }}>{book.title}</span>
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

function TOCItem({ item, level, jumpToPage, pdfDoc }: { item: any; level: number; jumpToPage: (page: number) => void; pdfDoc?: any }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasSubItems = item.items && item.items.length > 0

  const handleToggle = (e: React.MouseEvent) => {
    if (hasSubItems) {
      e.stopPropagation()
      setIsExpanded(!isExpanded)
    }
  }

  const handleClick = async () => {
    if (item.dest) {
      let dest = item.dest
      
      // If dest is a string, it's a named destination
      if (typeof dest === 'string' && pdfDoc) {
        dest = await pdfDoc.getDestination(dest)
      }

      if (dest && dest[0]) {
        if (typeof dest[0] === 'string') {
          jumpToPage(dest[0]) // EPUB or specific named dest
        } else if (pdfDoc) {
          try {
            const pageIndex = await pdfDoc.getPageIndex(dest[0])
            jumpToPage(pageIndex + 1)
          } catch (e) {
            console.error("Failed to get page index", e)
            // Fallback to num if available (though usually num is not the page number)
            if (dest[0].num && dest[0].num < 1000) { // arbitrary check
               jumpToPage(dest[0].num)
            }
          }
        }
      }
    }
  }

  return (
    <div className="toc-item-container" style={{ marginLeft: level > 0 ? 12 : 0 }}>
      <div 
        className={`outline-item ${hasSubItems ? 'has-sub' : ''}`} 
        onClick={handleClick}
      >
        {hasSubItems && (
          <button className="toc-toggle" onClick={handleToggle}>
            <ChevronRight 
              size={14} 
              style={{ 
                transform: isExpanded ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.2s'
              }} 
            />
          </button>
        )}
        <span className="toc-title">{item.title}</span>
      </div>
      {hasSubItems && isExpanded && (
        <div className="toc-children">
          {item.items.map((subItem: any, i: number) => (
            <TOCItem key={i} item={subItem} level={level + 1} jumpToPage={jumpToPage} pdfDoc={pdfDoc} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReaderView({ book, theme, onThemeChange, onBack, onPageChange }: { book: Book | null; theme: Theme; onThemeChange: (t: Theme) => void; onBack: () => void; onPageChange: (p: number) => void }) {
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1.1)
  const [error, setError] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [currentPage, setCurrentPage] = useState(book?.currentPage || 1)
  const [outline, setOutline] = useState<any[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const initialScrollDone = useRef(false)

  if (!book) return null

  const fileUrl = useMemo(() => `file:///${book.path.replace(/\\/g, '/').replace(/ /g, '%20')}`, [book.path])

  const lastUpdateRef = useRef<number>(0)

  const throttledPageChange = (p: number) => {
    setCurrentPage(p)
    const now = Date.now()
    if (now - lastUpdateRef.current > 1500) {
      onPageChange(p)
      lastUpdateRef.current = now
    }
  }

  const handleLoadSuccess = async (pdf: any) => {
    setPdfDoc(pdf)
    setNumPages(pdf.numPages)
    try {
      const toc = await pdf.getOutline()
      setOutline(toc || [])
    } catch (e) { console.error("Outline failed", e) }
  }

  useEffect(() => {
    if (numPages > 0 && !initialScrollDone.current && book.currentPage && book.currentPage > 1) {
      setTimeout(() => {
        const pageEl = document.getElementById(`page-${book.currentPage}`)
        if (pageEl && scrollRef.current) {
          pageEl.scrollIntoView({ behavior: 'auto', block: 'start' })
          initialScrollDone.current = true
        }
      }, 500)
    }
  }, [numPages, book.currentPage])

  const jumpToPage = (pageNumber: any) => {
    if (book.format === 'epub') {
      // For EPUB, we might get a CFI string or an href
      if (typeof pageNumber === 'string') {
        window.dispatchEvent(new CustomEvent('epub-jump', { detail: pageNumber }))
      }
      return
    }
    const pageEl = document.getElementById(`page-${pageNumber}`)
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="reader-shell">
      <div className="reader-content-layout">
        <AnimatePresence>
          {showSidebar && (
            <motion.div 
              initial={{ x: -320 }} 
              animate={{ x: 0 }} 
              exit={{ x: -320 }} 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="reader-sidebar"
            >
              <div className="reader-sidebar-header">
                <span className="reader-sidebar-title">Outline</span>
                <button onClick={() => setShowSidebar(false)} className="oasis-btn-sm glass"><X size={14} /></button>
              </div>
              <div className="reader-sidebar-scroll">
                {outline.length > 0 ? (
                  outline.map((item, i) => (
                    <TOCItem key={i} item={item} level={0} jumpToPage={jumpToPage} pdfDoc={pdfDoc} />
                  ))
                ) : (
                  <div style={{ color: 'var(--c-text3)', fontSize: 13, padding: '20px 8px' }}>No outline available</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="reader-body-wrapper" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {/* Floating Oasis Controls — Top Left */}
          <div style={{ position: 'absolute', top: 30, left: 30, zIndex: 1000, display: 'flex', gap: 12 }}>
            <button className="oasis-btn glass" onClick={onBack} title="Exit View">
              <ChevronLeft size={18} />
            </button>
            <button className="oasis-btn glass" onClick={() => setShowSidebar(!showSidebar)} title="Toggle Sidebar">
              <List size={18} />
            </button>
          </div>

          {/* Floating Oasis Controls — Top Right */}
          <div style={{ position: 'absolute', top: 30, right: 30, zIndex: 1000, display: 'flex', gap: 12 }}>
            <div className="theme-selector-pill glass">
              <button 
                className={`theme-dot ${theme === 'dark' ? 'active' : ''}`} 
                style={{ background: '#050505' }} 
                onClick={() => onThemeChange('dark')}
                title="Deep Dark"
              />
              <button 
                className={`theme-dot ${theme === 'grayish' ? 'active' : ''}`} 
                style={{ background: '#1c1917' }} 
                onClick={() => onThemeChange('grayish')}
                title="Stone Gray"
              />
              <button 
                className={`theme-dot ${theme === 'light' ? 'active' : ''}`} 
                style={{ background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.1)' }} 
                onClick={() => onThemeChange('light')}
                title="Studio Light"
              />
            </div>
            <button className="oasis-btn glass" onClick={() => setScale(s => Math.min(s + 0.2, 3))}><ZoomIn size={18} /></button>
            <button className="oasis-btn glass" onClick={() => setScale(s => Math.max(s - 0.2, 0.5))}><ZoomOut size={18} /></button>
          </div>

          <div ref={scrollRef} className="reader-body" style={{ overflowY: 'auto', flex: 1, padding: '100px 0', scrollBehavior: 'smooth' }}>
            {error ? (
              <div style={{ height: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ff4444' }}>
                <AlertCircle size={40} />
                <p style={{ marginTop: 10 }}>Manuscript Offline</p>
                <p style={{ fontSize: 12, opacity: 0.6 }}>{error}</p>
              </div>
            ) : book.format === 'pdf' ? (
              <Document file={fileUrl} onLoadSuccess={handleLoadSuccess} onLoadError={(e) => setError(e.message)}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 60 }}>
                  {useMemo(() => Array.from({ length: numPages }, (_, i) => (
                    <LazyPage 
                      key={i} 
                      pageNumber={i + 1} 
                      scale={scale} 
                      isDarkMode={theme !== 'light'} 
                      onInView={() => throttledPageChange(i + 1)}
                    />
                  )), [numPages, scale, theme])}
                </div>
              </Document>
            ) : (
              <EpubReader url={fileUrl} theme={theme} onPageChange={throttledPageChange} onTocLoaded={setOutline} />
            )}
          </div>
        </div>
      </div>


      {/* Page Indicator Pill */}
      <div className="page-indicator-pill">
        <span className="page-indicator-text">
          PAGE <span className="page-indicator-curr">{currentPage}</span> / {numPages}
        </span>
      </div>

      {/* Subtle Return to Top Indicator */}
      <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 1000 }}>
        <button className="oasis-btn glass" onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} title="Return to Start">
          <ChevronUp size={20} />
        </button>
      </div>

    </motion.div>
  )
}



const LazyPage = React.memo(function LazyPage({ pageNumber, scale, isDarkMode, onInView }: any) {
  const { ref: renderRef, inView: isRenderInView } = useInView({
    triggerOnce: false,
    rootMargin: '1000px 0px',
  })

  const { ref: trackRef, inView: isTrackInView } = useInView({
    triggerOnce: false,
    threshold: 0.15,
    rootMargin: '-10% 0px -70% 0px', 
  })

  const setRefs = (node: any) => {
    if (node) {
      renderRef(node)
      trackRef(node)
    }
  }

  useEffect(() => {
    if (isTrackInView) {
      onInView()
    }
  }, [isTrackInView])

  return (
    <div ref={setRefs} id={`page-${pageNumber}`} style={{ minHeight: isRenderInView ? 'auto' : `${800 * scale}px`, width: '100%', display: 'flex', justifyContent: 'center', transition: 'opacity 0.4s' }}>
      {isRenderInView ? (
        <div className={`pdf-canvas-container ${isDarkMode ? 'dark-pdf' : ''}`} style={{ transition: 'all 0.4s' }}>
          <Page 
            pageNumber={pageNumber} 
            scale={scale} 
            renderTextLayer={true} 
            renderAnnotationLayer={true} 
            loading={<div style={{ height: 800 * scale, width: 600 * scale, background: 'var(--c-surface2)', borderRadius: 4 }} />}
          />
        </div>
      ) : (
        <div style={{ height: 800 * scale, width: 600 * scale, background: 'var(--c-surface)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 10, color: 'var(--c-text3)', letterSpacing: '0.2em' }}>PAGE {pageNumber}</p>
        </div>
      )}
    </div>
  )
})

/* EPUB Reader Component */
function EpubReader({ url, theme, onPageChange, onTocLoaded }: { url: string; theme: Theme; onPageChange: (p: number) => void; onTocLoaded: (toc: any[]) => void }) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!viewerRef.current) return

    const book = Epub(url)
    
    // Load TOC
    book.loaded.navigation.then((nav) => {
      // Map epub.js TOC to our internal format
      const mapToc = (tocItems: any[]): any[] => {
        return tocItems.map(item => ({
          title: item.label,
          dest: [item.href], // Use href for EPUB jump
          items: item.subitems ? mapToc(item.subitems) : []
        }))
      }
      onTocLoaded(mapToc(nav.toc))
    })

    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      flow: 'scrolled',
      manager: 'continuous'
    })

    renditionRef.current = rendition
    
    const display = rendition.display()
    display.then(() => setLoading(false))

    rendition.on('relocated', (location: any) => {
      if (location.start) {
        onPageChange(location.start.displayed.page || 1)
      }
    })

    // Listen for jump events
    const handleJump = (e: any) => {
      rendition.display(e.detail)
    }
    window.addEventListener('epub-jump' as any, handleJump)

    // Apply styles based on theme
    const themeStyles = {
      body: {
        background: 'transparent !important',
        color: theme === 'light' ? '#1A1A1A' : theme === 'grayish' ? '#fafaf9' : '#FAFAFA',
        fontFamily: 'serif !important',
        fontSize: '18px !important',
        lineHeight: '1.6 !important',
        padding: '0 40px !important'
      }
    }

    rendition.themes.register('custom', themeStyles)
    rendition.themes.select('custom')

    return () => {
      window.removeEventListener('epub-jump' as any, handleJump)
      book.destroy()
    }
  }, [url, theme])

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div 
        ref={viewerRef} 
        style={{ 
          maxWidth: 900, 
          width: '100%', 
          height: '100%', 
          background: 'var(--c-surface)', 
          boxShadow: 'var(--c-card-shadow)',
          borderRadius: 8,
          overflow: 'hidden'
        }} 
      />
      {loading && <div className="epub-loading">Initializing Manuscript...</div>}
    </div>
  )
}

