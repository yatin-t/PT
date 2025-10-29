import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import '../css/teacherdashboard.css';

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  const [showCreateUnit, setShowCreateUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [creating, setCreating] = useState(false);
  
  const [selectedFiles, setSelectedFiles] = useState({});
  const [fileTag, setFileTag] = useState({});
  const [uploading, setUploading] = useState({});
  
  const [expandedUnit, setExpandedUnit] = useState(null);

  useEffect(() => {
    loadUnits();
  }, []);

  async function loadUnits() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('teachers/');
      const teacher = (res.data.teachers || []).find(t => t.teacher.id === user?.id);
      setUnits(teacher?.units || []);
    } catch (e) {
      console.error('[TeacherDashboard] Error loading units:', e);
      setError('Failed to load units. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUnit(e) {
    e.preventDefault();
    if (!newUnitName.trim()) {
      alert('Please enter a unit name');
      return;
    }
    
    try {
      setCreating(true);
      const formData = new FormData();
      formData.append('name', newUnitName.trim());
      
      // Use the correct Django endpoint (not /api/v1/)
      const res = await api.post('../create-unit/', formData);
      
      if (res.data.success) {
        await loadUnits();
        setNewUnitName('');
        setShowCreateUnit(false);
        alert('Unit created successfully!');
      }
    } catch (e) {
      console.error('[TeacherDashboard] Error creating unit:', e);
      const errorMsg = e.response?.data?.error || 'Failed to create unit';
      alert(errorMsg);
    } finally {
      setCreating(false);
    }
  }

  function handleFileSelect(unitId, files) {
    console.log('[File Select Debug] Unit ID:', unitId);
    console.log('[File Select Debug] Files selected:', files);
    console.log('[File Select Debug] File count:', files?.length);
    setSelectedFiles(prev => ({ ...prev, [unitId]: files }));
    if (!fileTag[unitId]) {
      setFileTag(prev => ({ ...prev, [unitId]: 'study_material' }));
    }
  }

  async function handleFileUpload(unitId) {
    const files = selectedFiles[unitId];
    console.log('[Upload Debug] Starting upload for unit:', unitId);
    console.log('[Upload Debug] Selected files:', files);
    console.log('[Upload Debug] Files type:', typeof files, Array.isArray(files), files instanceof FileList);
    
    if (!files || files.length === 0) {
      alert('Please select files to upload');
      return;
    }
    
    try {
      setUploading(prev => ({ ...prev, [unitId]: true }));
      const formData = new FormData();
      
      // Convert to array if it's FileList or array-like object
      const fileArray = Array.isArray(files) ? files : Array.from(files);
      console.log('[Upload Debug] File array:', fileArray);
      
      fileArray.forEach((file, i) => {
        formData.append('files', file);
        console.log(`[Upload Debug] Added file ${i + 1}:`, file.name, file.size, file.type);
      });
      
      formData.append('unit_id', unitId);
      formData.append('tag', fileTag[unitId] || 'study_material');
      
      // Debug: Show all FormData entries
      console.log('[Upload Debug] FormData contents:');
      for (let pair of formData.entries()) {
        console.log(`  ${pair[0]}:`, pair[1]);
      }
      
      console.log('[Upload Debug] FormData prepared. Unit ID:', unitId, 'Tag:', fileTag[unitId] || 'study_material');
      console.log('[Upload Debug] Sending POST to: ../upload-file/');
      
      // Important: Don't set Content-Type header - let browser set it with proper boundary
      // Override the default application/json from api.js
      const res = await api.post('../upload-file/', formData, {
        headers: {
          'Content-Type': undefined, // This removes the default Content-Type
        },
      });
      
      console.log('[Upload Debug] Server response:', res.data);
      
      if (res.data.success) {
        if (res.data.files && res.data.files.length > 0) {
          await loadUnits();
          setSelectedFiles(prev => ({ ...prev, [unitId]: null }));
          
          let message = `✅ ${res.data.files.length} file(s) uploaded successfully!`;
          
          // Show warning if files were skipped
          if (res.data.skipped_files && res.data.skipped_files.length > 0) {
            message += `\n\n⚠️ ${res.data.skipped_files.length} file(s) were skipped:\n`;
            res.data.skipped_files.forEach(file => {
              message += `\n• ${file.name}: ${file.reason}`;
            });
          }
          
          alert(message);
        } else {
          // No files uploaded
          let message = `⚠️ No files were uploaded.`;
          
          if (res.data.skipped_files && res.data.skipped_files.length > 0) {
            message += `\n\nAll files were skipped:\n`;
            res.data.skipped_files.forEach(file => {
              message += `\n• ${file.name}: ${file.reason}`;
            });
          } else {
            message += `\n\nCheck Django logs for details.`;
          }
          
          alert(message);
        }
      } else {
        alert(`❌ Upload failed: ${res.data.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('[TeacherDashboard] Error uploading files:', e);
      console.error('[Upload Debug] Full error:', e.response || e);
      const errorMsg = e.response?.data?.error || e.message || 'Failed to upload files';
      alert(`❌ Upload failed: ${errorMsg}`);
    } finally {
      setUploading(prev => ({ ...prev, [unitId]: false }));
    }
  }

  async function handlePublishFiles(unitId) {
    if (!confirm('Publish all unpublished files in this unit?')) return;
    
    try {
      const formData = new FormData();
      formData.append('unit_id', unitId);
      const res = await api.post('../publish-files/', formData);
      
      if (res.data.success) {
        await loadUnits();
        alert(res.data.message);
      }
    } catch (e) {
      console.error('[TeacherDashboard] Error publishing files:', e);
      alert('Failed to publish files');
    }
  }

  async function handleDeleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await api.delete(`../delete-file/${fileId}/`);
      await loadUnits();
      alert('File deleted successfully');
    } catch (e) {
      console.error('[TeacherDashboard] Error deleting file:', e);
      alert('Failed to delete file');
    }
  }

  async function handleDeleteUnit(unitId) {
    if (!confirm('Are you sure you want to delete this unit? All files will be deleted.')) return;
    
    try {
      await api.delete(`../delete-unit/${unitId}/`);
      await loadUnits();
      alert('Unit deleted successfully');
    } catch (e) {
      console.error('[TeacherDashboard] Error deleting unit:', e);
      alert('Failed to delete unit');
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate('/');
    } catch (e) {
      console.error('[TeacherDashboard] Logout error:', e);
      navigate('/');
    }
  }

  function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  function humanizeTag(tag) {
    return (tag || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        <i className="fas fa-spinner fa-spin" style={{ marginRight: 10 }}></i>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="teacher-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <i className="fas fa-graduation-cap logo-icon"></i>
          <span className="logo-text">
            cloud<span className="highlight">ED</span>
          </span>
        </div>
        <div className="header-right">
          <div 
            className="user-icon" 
            onClick={() => setMenuOpen(!menuOpen)}
            role="button"
          >
            <i className="fas fa-user"></i>
          </div>
          {menuOpen && (
            <div className="dropdown open">
              <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fas fa-chalkboard-teacher" style={{ color: '#7f65f3' }}></i>
                {user?.full_name || 'Teacher'}
              </p>
              <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {user?.email || ''}
              </p>
              {user?.subject && (
                <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                  Subject: {user.subject}
                </p>
              )}
              <button 
                onClick={handleLogout}
                style={{ 
                  marginTop: 12, 
                  background: '#f3f4f6', 
                  border: 'none', 
                  padding: '8px 12px', 
                  borderRadius: 6, 
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                <i className="fas fa-sign-out-alt" style={{ marginRight: 8 }}></i>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}

      <div className="dashboard-container">
        <aside className="sidebar">
          <h2>
            <i className="fas fa-chalkboard-teacher"></i>
            Teacher Portal
          </h2>
          <p>Manage your course units and materials.</p>
          
          <div className="teacher-stats">
            <div className="stat-card">
              <i className="fas fa-folder"></i>
              <div>
                <h3>{units.length}</h3>
                <p>Total Units</p>
              </div>
            </div>
            <div className="stat-card">
              <i className="fas fa-file"></i>
              <div>
                <h3>{units.reduce((acc, u) => acc + (u.files?.length || 0), 0)}</h3>
                <p>Total Files</p>
              </div>
            </div>
          </div>

          <button 
            className="create-unit-btn"
            onClick={() => setShowCreateUnit(true)}
          >
            <i className="fas fa-plus"></i>
            Create New Unit
          </button>
        </aside>

        <main className="main-content">
          <h1>Your Course Units</h1>
          
          {error && (
            <div className="alert error">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          {units.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-folder-open"></i>
              <h3>No units yet</h3>
              <p>Create your first course unit to get started</p>
              <button 
                className="create-unit-btn-primary"
                onClick={() => setShowCreateUnit(true)}
              >
                <i className="fas fa-plus"></i>
                Create Unit
              </button>
            </div>
          ) : (
            <div className="units-grid">
              {units.map(unit => (
                <div 
                  key={unit.id} 
                  className={`unit-card ${expandedUnit === unit.id ? 'expanded' : ''}`}
                >
                  <div className="unit-header" onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)}>
                    <div>
                      <h3>
                        <i className="fas fa-folder"></i>
                        {unit.name}
                      </h3>
                      <p className="unit-meta">
                        {unit.files?.length || 0} file(s) • 
                        {unit.files?.filter(f => f.is_published).length || 0} published
                      </p>
                    </div>
                    <i className={`fas fa-chevron-${expandedUnit === unit.id ? 'up' : 'down'}`}></i>
                  </div>

                  {expandedUnit === unit.id && (
                    <div className="unit-body">
                      <div className="upload-section">
                        <h4>
                          <i className="fas fa-cloud-upload-alt"></i>
                          Upload Files
                        </h4>
                        
                        <div className="file-upload-form">
                          <label className="file-select-label">
                            <i className="fas fa-paperclip"></i>
                            {selectedFiles[unit.id]?.length > 0 
                              ? `${selectedFiles[unit.id].length} file(s) selected` 
                              : 'Choose files'}
                            <input 
                              type="file"
                              multiple
                              onChange={(e) => handleFileSelect(unit.id, Array.from(e.target.files))}
                              style={{ display: 'none' }}
                            />
                          </label>

                          <select 
                            value={fileTag[unit.id] || 'study_material'}
                            onChange={(e) => setFileTag(prev => ({ ...prev, [unit.id]: e.target.value }))}
                            className="tag-select"
                          >
                            <option value="study_material">Study Material</option>
                            <option value="assignment">Assignment</option>
                            <option value="personal_note">Personal Note</option>
                            <option value="question_bank">Question Bank</option>
                          </select>

                          <button
                            onClick={() => handleFileUpload(unit.id)}
                            disabled={uploading[unit.id] || !selectedFiles[unit.id]?.length}
                            className="upload-btn"
                          >
                            {uploading[unit.id] ? (
                              <>
                                <i className="fas fa-spinner fa-spin"></i>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-upload"></i>
                                Upload
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="files-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <h4 style={{ margin: 0 }}>
                            <i className="fas fa-file-alt"></i>
                            Files ({unit.files?.length || 0})
                          </h4>
                          {unit.files?.some(f => !f.is_published) && (
                            <button
                              onClick={() => handlePublishFiles(unit.id)}
                              className="publish-all-btn"
                              style={{
                                padding: '6px 12px',
                                background: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                fontSize: 13,
                                cursor: 'pointer'
                              }}
                            >
                              <i className="fas fa-eye"></i> Publish All
                            </button>
                          )}
                        </div>
                        
                        {!unit.files || unit.files.length === 0 ? (
                          <p className="no-files">No files uploaded yet</p>
                        ) : (
                          <div className="files-list">
                            {unit.files.map(file => (
                              <div key={file.id} className="file-item">
                                <div className="file-info">
                                  <i className="fas fa-file-alt"></i>
                                  <div>
                                    <h5>{file.original_name}</h5>
                                    <p className="file-meta">
                                      {formatFileSize(file.file_size)} • 
                                      <span className={`tag tag-${file.tag}`}>
                                        {humanizeTag(file.tag)}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="file-actions">
                                  <span className={`publish-status ${file.is_published ? 'published' : 'unpublished'}`}>
                                    {file.is_published ? 'Published' : 'Draft'}
                                  </span>
                                  
                                  <a 
                                    href={`/api/download-file/${file.id}/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="download-btn"
                                    title="Download"
                                  >
                                    <i className="fas fa-download"></i>
                                  </a>
                                  
                                  <button
                                    onClick={() => handleDeleteFile(file.id)}
                                    className="delete-btn"
                                    style={{
                                      padding: '8px 12px',
                                      background: '#dc3545',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: 6,
                                      cursor: 'pointer'
                                    }}
                                    title="Delete"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="unit-actions" style={{ marginTop: 20, paddingTop: 20, borderTop: '2px solid #f0f0f0' }}>
                        <button
                          onClick={() => handleDeleteUnit(unit.id)}
                          className="delete-unit-btn"
                          style={{
                            padding: '10px 20px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600
                          }}
                        >
                          <i className="fas fa-trash-alt"></i>
                          Delete Unit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {showCreateUnit && (
        <>
          <div className="modal-overlay" onClick={() => !creating && setShowCreateUnit(false)} />
          <div className="modal">
            <div className="modal-header">
              <h2>Create New Unit</h2>
              <button 
                onClick={() => setShowCreateUnit(false)}
                disabled={creating}
                className="close-btn"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleCreateUnit}>
              <div className="form-group">
                <label htmlFor="unitName">Unit Name</label>
                <input
                  id="unitName"
                  type="text"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder="e.g., Chapter 1: Introduction"
                  disabled={creating}
                  required
                  autoFocus
                />
              </div>
              
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateUnit(false)}
                  disabled={creating}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newUnitName.trim()}
                  className="submit-btn"
                >
                  {creating ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      Create Unit
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}