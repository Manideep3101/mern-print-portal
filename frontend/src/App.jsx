import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://mern-print-portal.onrender.com/api';

export default function App() {
  const [file, setFile] = useState(null);
  const [filesList, setFilesList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Fetch all files when page loads
  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API_URL}/files`);
      setFilesList(res.data);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // 2. Handle File Upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Please select a file first!');

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      await axios.post(`${API_URL}/upload`, formData);
      setFile(null); // Reset file input
      document.getElementById('fileInput').value = null;
      fetchFiles(); // Refresh dashboard list immediately
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  // 3. Handle File Download
  const handleDownload = async (id, originalName) => {
    try {
      const response = await axios({
        url: `${API_URL}/download/${id}`,
        method: 'GET',
        responseType: 'blob',
      });

      // Create a blob URL to trigger browser download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download file. It may have expired or been deleted.');
    }
  };

  // 4. Handle File Deletion
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await axios.delete(`${API_URL}/files/${id}`);
      // Remove deleted file from state without needing a full reload
      setFilesList(filesList.filter((f) => f._id !== id));
    } catch (err) {
      alert('Failed to delete file.');
    }
  };

  // Helper to format file sizes nicely (KB/MB)
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>
          <span role="img" aria-label="folder">&#128194;</span> Print Shop Dashboard
        </h1>
        <p style={styles.subtitle}>Upload from home. Open this URL at any print shop to download and delete.</p>
      </header>

      {/* SECTION 1: UPLOAD BOX */}
      <div style={styles.uploadCard}>
        <form onSubmit={handleUpload} style={styles.uploadForm}>
          <input 
            id="fileInput"
            type="file" 
            onChange={(e) => setFile(e.target.files[0])} 
            style={styles.fileInput}
          />
          <button type="submit" disabled={uploading} style={styles.uploadBtn}>
            {uploading ? 'Uploading...' : 'Upload File to Dashboard'}
          </button>
        </form>
      </div>

      {/* SECTION 2: LIVE DASHBOARD */}
      <div style={styles.dashboardCard}>
        <h2 style={styles.dashboardTitle}>
          Your Available Files ({filesList.length})
        </h2>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#666' }}>Loading your dashboard...</p>
        ) : filesList.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No files uploaded yet. Upload a document above to get started!</p>
          </div>
        ) : (
          <div style={styles.listContainer}>
            {filesList.map((item) => (
              <div key={item._id} style={styles.fileRow}>
                <div style={styles.fileInfo}>
                  <strong style={styles.fileName}>{item.originalName}</strong>
                  <span style={styles.fileMeta}>
                    {formatSize(item.size)} &bull; Uploaded {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>

                <div style={styles.actionGroup}>
                  <button 
                    onClick={() => handleDownload(item._id, item.originalName)} 
                    style={styles.downloadBtn}
                  >
                    Download
                  </button>
                  <button 
                    onClick={() => handleDelete(item._id)} 
                    style={styles.deleteBtn}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Modern styling for a clean dashboard UI
const styles = {
  container: { maxWidth: '650px', margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, -apple-system, sans-serif' },
  header: { textAlign: 'center', marginBottom: '30px' },
  title: { margin: '0 0 8px 0', color: '#111827', fontSize: '1.8rem' },
  subtitle: { margin: 0, color: '#4b5563', fontSize: '0.95rem' },
  uploadCard: { background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '24px', marginBottom: '30px' },
  uploadForm: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  fileInput: { flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white' },
  uploadBtn: { padding: '10px 20px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' },
  dashboardCard: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  dashboardTitle: { margin: '0 0 20px 0', fontSize: '1.25rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' },
  emptyState: { textAlign: 'center', padding: '40px 0', color: '#64748b' },
  listContainer: { display: 'flex', flexDirection: 'column', gap: '12px' },
  fileRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '8px', flexWrap: 'wrap', gap: '10px' },
  fileInfo: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  fileName: { fontSize: '1rem', color: '#0f172a', marginBottom: '4px', wordBreak: 'break-all' },
  fileMeta: { fontSize: '0.85rem', color: '#64748b' },
  actionGroup: { display: 'flex', gap: '8px' },
  downloadBtn: { padding: '8px 14px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' },
  deleteBtn: { padding: '8px 14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }
};