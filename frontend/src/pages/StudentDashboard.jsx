import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../contexts/AuthContext'
import '../css/studentdashboard.css'

export default function StudentDashboard() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [expandedTeacher, setExpandedTeacher] = useState(null)
  const [expandedUnit, setExpandedUnit] = useState({})
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')
  
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('teachers/')
        setTeachers(res.data.teachers || [])
      } catch (e) {
        console.error('[StudentDashboard] Error loading teachers:', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  function toggleTeacher(id) {
    setExpandedTeacher(prev => (prev === id ? null : id))
  }

  function toggleUnit(unitId) {
    setExpandedUnit(prev => ({ ...prev, [unitId]: !prev[unitId] }))
  }

  const allSubjects = useMemo(() => {
    const subjects = new Set()
    teachers.forEach(t => {
      if (t.teacher.subject) subjects.add(t.teacher.subject)
    })
    return Array.from(subjects).sort()
  }, [teachers])

  const allTags = useMemo(() => {
    const tags = new Set()
    teachers.forEach(t => {
      (t.units || []).forEach(u => {
        (u.files || []).forEach(f => {
          if (f && f.tag) tags.add(f.tag)
        })
      })
    })
    return Array.from(tags).sort()
  }, [teachers])

  const allUnits = useMemo(() => {
    const units = new Set()
    teachers.forEach(t => {
      (t.units || []).forEach(u => {
        if (u.name) units.add(u.name)
      })
    })
    return Array.from(units).sort()
  }, [teachers])

  const humanizeTag = (tag = '') => String(tag).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const filteredTeachers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    
    return teachers
      .map(t => ({ ...t, units: t.units || [] }))
      .map(t => {
        const units = t.units.filter(u => {
          if (selectedUnit && u.name !== selectedUnit) return false
          if (selectedTag) {
            const unitTags = (u.files || []).map(f => f.tag || '')
            if (!unitTags.includes(selectedTag)) return false
          }
          return true
        })
        return { ...t, units }
      })
      .filter(t => {
        if (selectedSubject && t.teacher.subject !== selectedSubject) return false
        
        if (query) {
          const matchName = (t.teacher.full_name || '').toLowerCase().includes(query)
          const matchSubject = (t.teacher.subject || '').toLowerCase().includes(query)
          const matchUnit = t.units.some(u => (u.name || '').toLowerCase().includes(query))
          if (!(matchName || matchSubject || matchUnit)) return false
        }
        
        if ((selectedUnit || selectedTag) && t.units.length === 0) return false
        
        return true
      })
  }, [teachers, searchQuery, selectedSubject, selectedTag, selectedUnit])

  function clearAllFilters() {
    setSearchQuery('')
    setSelectedSubject('')
    setSelectedTag('')
    setSelectedUnit('')
  }

  async function handleLogout() {
    try {
      await logout()
      navigate('/')
    } catch (e) {
      console.error('[StudentDashboard] Logout error:', e)
      navigate('/')
    }
  }

  function getFileIcon(fileName) {
    const ext = fileName?.split('.').pop()?.toLowerCase() || ''
    if (ext === 'pdf') return 'fa-file-pdf'
    if (['doc', 'docx'].includes(ext)) return 'fa-file-word'
    if (['ppt', 'pptx'].includes(ext)) return 'fa-file-powerpoint'
    if (['xls', 'xlsx'].includes(ext)) return 'fa-file-excel'
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'fa-file-image'
    if (['mp4', 'avi', 'mov'].includes(ext)) return 'fa-file-video'
    if (ext === 'txt') return 'fa-file-alt'
    return 'fa-file'
  }

  function getTagColor(tag) {
    const colors = {
      'study_material': '#3b82f6',
      'assignment': '#f59e0b',
      'personal_note': '#8b5cf6',
      'question_bank': '#10b981'
    }
    return colors[tag] || '#6b7280'
  }

  async function handleDownload(e, fileId, fileName, fileUrl) {
    e.preventDefault()
    
    if (fileUrl) {
      // For Cloudinary files, use direct download link
      const link = document.createElement('a')
      link.href = fileUrl
      link.setAttribute('download', fileName)
      link.setAttribute('target', '_blank')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } else {
      // Fallback to API endpoint if no direct URL
      try {
        const response = await api.get(`/download-file/${fileId}/`, {
          responseType: 'blob'
        })
        
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
      } catch (error) {
        console.error('[StudentDashboard] Download error:', error)
        alert('Failed to download file. Please try again.')
      }
    }
  }

  const totalFiles = useMemo(() => {
    return filteredTeachers.reduce((sum, t) => {
      return sum + t.units.reduce((uSum, u) => {
        return uSum + (u.files || []).filter(f => f.is_published).length
      }, 0)
    }, 0)
  }, [filteredTeachers])

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 40, marginBottom: 20 }}></i>
        <p style={{ fontSize: 18 }}>Loading your courses...</p>
      </div>
    )
  }

  const activeFilters = []
  if (searchQuery.trim()) activeFilters.push(`"${searchQuery.trim()}"`)
  if (selectedSubject) activeFilters.push(selectedSubject)
  if (selectedTag) activeFilters.push(humanizeTag(selectedTag))
  if (selectedUnit) activeFilters.push(selectedUnit)

  return (
    <div className="student-dashboard">
      <header className="dashboard-header">
        <div className="header-container">
          <div className="header-left">
            <i className="fas fa-graduation-cap" style={{ fontSize: 32, color: '#fff', marginRight: 12 }}></i>
            <span className="logo-text">cloud<span style={{ color: '#fbbf24' }}>ED</span></span>
            <span className="user-badge">
              <i className="fas fa-user-graduate" style={{ marginRight: 6 }}></i>
              Student
            </span>
          </div>
          <div className="header-right">
            <div className="user-menu" onClick={() => setMenuOpen(v => !v)}>
              <div className="user-avatar">
                <i className="fas fa-user"></i>
              </div>
              <span className="user-name">{user?.full_name || 'Student'}</span>
              <i className={`fas fa-chevron-${menuOpen ? 'up' : 'down'}`} style={{ fontSize: 12 }}></i>
            </div>
            {menuOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <i className="fas fa-user-circle" style={{ fontSize: 40, color: '#7f65f3' }}></i>
                  <div>
                    <p className="dropdown-name">{user?.full_name}</p>
                    <p className="dropdown-email">{user?.email}</p>
                  </div>
                </div>
                <button className="dropdown-logout" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt"></i>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}

      <div className="dashboard-content">
        <aside className="dashboard-sidebar">
          <div className="sidebar-section">
            <div className="welcome-card">
              <h3>
                <i className="fas fa-hand-wave" style={{ marginRight: 8, color: '#fbbf24' }}></i>
                Welcome Back!
              </h3>
              <p>{user?.full_name || 'Student'}</p>
            </div>
          </div>

          <div className="sidebar-section">
            <h4>
              <i className="fas fa-chart-bar" style={{ marginRight: 8 }}></i>
              Quick Stats
            </h4>
            <div className="stats-grid">
              <div className="stat-item">
                <i className="fas fa-chalkboard-teacher"></i>
                <div>
                  <p className="stat-value">{filteredTeachers.length}</p>
                  <p className="stat-label">Teachers</p>
                </div>
              </div>
              <div className="stat-item">
                <i className="fas fa-folder"></i>
                <div>
                  <p className="stat-value">{filteredTeachers.reduce((sum, t) => sum + t.units.length, 0)}</p>
                  <p className="stat-label">Units</p>
                </div>
              </div>
              <div className="stat-item">
                <i className="fas fa-file-alt"></i>
                <div>
                  <p className="stat-value">{totalFiles}</p>
                  <p className="stat-label">Files</p>
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h4>
              <i className="fas fa-info-circle" style={{ marginRight: 8 }}></i>
              About
            </h4>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
              Browse courses from your teachers, download study materials, and stay organized with cloudED.
            </p>
          </div>
        </aside>

        <main className="dashboard-main">
          <div className="filter-panel">
            <div className="filter-header">
              <h2>
                <i className="fas fa-book-reader" style={{ marginRight: 12, color: '#7f65f3' }}></i>
                Course Library
              </h2>
              <p className="filter-subtitle">
                Showing {filteredTeachers.length} teacher{filteredTeachers.length !== 1 ? 's' : ''}  {totalFiles} file{totalFiles !== 1 ? 's' : ''} available
              </p>
            </div>

            <div className="filter-controls-modern">
              <div className="search-box">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search teachers, subjects, or units..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <i className="fas fa-times clear-icon" onClick={() => setSearchQuery('')}></i>
                )}
              </div>

              <div className="filter-dropdowns">
                <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                  <option value="">All Subjects</option>
                  {allSubjects.map(s => (
                    <option value={s} key={s}>{s}</option>
                  ))}
                </select>

                <select value={selectedTag} onChange={e => setSelectedTag(e.target.value)}>
                  <option value="">All Tags</option>
                  {allTags.map(t => (
                    <option value={t} key={t}>{humanizeTag(t)}</option>
                  ))}
                </select>

                <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}>
                  <option value="">All Units</option>
                  {allUnits.map(u => (
                    <option value={u} key={u}>{u}</option>
                  ))}
                </select>

                <button className="clear-filters-btn" onClick={clearAllFilters}>
                  <i className="fas fa-redo-alt"></i>
                  Reset
                </button>
              </div>

              {activeFilters.length > 0 && (
                <div className="active-filters">
                  <span>Active filters:</span>
                  {activeFilters.map((filter, idx) => (
                    <span key={idx} className="filter-tag">{filter}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="teachers-grid">
            {filteredTeachers.length === 0 && (
              <div className="no-results">
                <i className="fas fa-search" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16 }}></i>
                <h3>No courses found</h3>
                <p>Try adjusting your filters or search query</p>
                <button onClick={clearAllFilters} className="btn-primary">
                  <i className="fas fa-redo-alt" style={{ marginRight: 8 }}></i>
                  Clear Filters
                </button>
              </div>
            )}

            {filteredTeachers.map(item => (
              <div key={item.teacher.id} className="teacher-card">
                <div
                  className="teacher-card-header"
                  onClick={() => toggleTeacher(item.teacher.id)}
                >
                  <div className="teacher-avatar">
                    <i className="fas fa-user-tie"></i>
                  </div>
                  <div className="teacher-info-section">
                    <h3 className="teacher-name-modern">{item.teacher.full_name}</h3>
                    <p className="teacher-subject-modern">
                      <i className="fas fa-graduation-cap" style={{ marginRight: 6 }}></i>
                      {item.teacher.subject || 'General Course'}
                    </p>
                    <div className="teacher-meta">
                      <span>
                        <i className="fas fa-folder"></i>
                        {item.units.length} unit{item.units.length !== 1 ? 's' : ''}
                      </span>
                      <span>
                        <i className="fas fa-file"></i>
                        {item.units.reduce((sum, u) => sum + (u.files || []).filter(f => f.is_published).length, 0)} file{item.units.reduce((sum, u) => sum + (u.files || []).filter(f => f.is_published).length, 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <i className={`fas fa-chevron-${expandedTeacher === item.teacher.id ? 'up' : 'down'} expand-icon`}></i>
                </div>

                {expandedTeacher === item.teacher.id && item.units.length > 0 && (
                  <div className="units-container">
                    {item.units.map(u => {
                      const publishedFiles = (u.files || []).filter(f => f.is_published)
                      if (publishedFiles.length === 0) return null
                      
                      return (
                        <div key={u.id} className="unit-card-modern">
                          <div
                            className="unit-header-modern"
                            onClick={() => toggleUnit(u.id)}
                          >
                            <div className="unit-icon">
                              <i className="fas fa-book"></i>
                            </div>
                            <div className="unit-details">
                              <h4>{u.name}</h4>
                              <span className="file-count">{publishedFiles.length} file{publishedFiles.length !== 1 ? 's' : ''}</span>
                            </div>
                            <i className={`fas fa-chevron-${expandedUnit[u.id] ? 'up' : 'down'} unit-expand-icon`}></i>
                          </div>

                          {expandedUnit[u.id] && (
                            <div className="files-list-modern">
                              {publishedFiles.map(f => (
                                <div
                                  key={f.id}
                                  className="file-item-modern"
                                  onClick={(e) => handleDownload(e, f.id, f.original_name, f.file_url)}
                                >
                                  <i className={`fas ${getFileIcon(f.original_name)} file-icon`}></i>
                                  <div className="file-info">
                                    <span className="file-name">{f.original_name}</span>
                                    <span className="file-meta">{f.get_file_size_display || ''}</span>
                                  </div>
                                  <span
                                    className="file-tag-badge"
                                    style={{ backgroundColor: getTagColor(f.tag) }}
                                  >
                                    {humanizeTag(f.tag)}
                                  </span>
                                  <i className="fas fa-download download-icon"></i>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {expandedTeacher === item.teacher.id && item.units.length === 0 && (
                  <div className="no-units">
                    <i className="fas fa-inbox"></i>
                    <p>No units available</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
