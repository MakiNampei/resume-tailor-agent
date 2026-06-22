import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { ExperienceManager } from './components/ExperienceManager';
import { TailorWizard } from './components/TailorWizard';
import { SavedResumes } from './components/SavedResumes';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);

  // --- Fetch Initial Data ---
  const fetchBlocks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/blocks`);
      if (res.ok) {
        const data = await res.json();
        setBlocks(data);
      }
    } catch (err) {
      console.error("Failed to fetch blocks:", err);
    }
  };

  const fetchResumes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/resumes`);
      if (res.ok) {
        const data = await res.json();
        setResumes(data);
      }
    } catch (err) {
      console.error("Failed to fetch resumes:", err);
    }
  };

  useEffect(() => {
    fetchBlocks();
    fetchResumes();
  }, []);


  // --- Experience Block CRUD ---
  
  const handleCreateBlock = async (blockData: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blockData)
      });
      if (res.ok) {
        await fetchBlocks();
      } else {
        throw new Error("Failed to create experience block");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating block.");
    }
  };

  const handleUpdateBlock = async (id: number, blockData: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/blocks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blockData)
      });
      if (res.ok) {
        await fetchBlocks();
      } else {
        throw new Error("Failed to update experience block");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating block.");
    }
  };

  const handleDeleteBlock = async (id: number) => {
    if (!confirm("Are you sure you want to delete this experience block?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/blocks/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchBlocks();
      } else {
        throw new Error("Failed to delete experience block");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting block.");
    }
  };


  // --- Resume Actions ---

  const handleSaveResume = async (resumeData: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/resumes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resumeData)
      });
      if (res.ok) {
        await fetchResumes();
      } else {
        throw new Error("Failed to save resume");
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteResume = async (id: number) => {
    if (!confirm("Are you sure you want to delete this tailored resume from history?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/resumes/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchResumes();
      } else {
        throw new Error("Failed to delete resume");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting resume.");
    }
  };

  // --- Danger Zone Purge All Data (Security Feature) ---

  const handlePurgeAllData = async () => {
    const confirm1 = confirm("⚠️ DANGER ZONE ⚠️\n\nAre you sure you want to delete ALL experience blocks and tailored resumes? This action CANNOT be undone.");
    if (!confirm1) return;

    const confirm2 = confirm("Please confirm once more: Do you want to permanently erase ALL data in your local database?");
    if (!confirm2) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/danger/purge`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert("All database records have been successfully purged.");
        await fetchBlocks();
        await fetchResumes();
        setCurrentView('dashboard');
      } else {
        throw new Error("Failed to purge database");
      }
    } catch (err) {
      console.error(err);
      alert("Error purging data.");
    }
  };

  // --- Document Downloads with Export Confirmations ---

  const handleDownloadDocx = async (resumeData: any) => {
    const isConfirmed = confirm(`Are you sure you want to export the resume for "${resumeData.job_title}" at "${resumeData.company}" as a DOCX document?`);
    if (!isConfirmed) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/resumes/export/docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resumeData)
      });
      if (!response.ok) throw new Error("Failed to download DOCX");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Resume_${resumeData.job_title}_${resumeData.company}.docx`.replace(/ /g, "_");
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert("Failed to export DOCX document.");
    }
  };

  const handleDownloadPdf = async (resumeData: any) => {
    const isConfirmed = confirm(`Are you sure you want to export the resume for "${resumeData.job_title}" at "${resumeData.company}" as a PDF document?`);
    if (!isConfirmed) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/resumes/export/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resumeData)
      });
      if (!response.ok) throw new Error("Failed to download PDF");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Resume_${resumeData.job_title}_${resumeData.company}.pdf`.replace(/ /g, "_");
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
      alert("Failed to export PDF document.");
    }
  };

  // --- View Router ---
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            resumes={resumes} 
            blocksCount={blocks.length} 
            onNavigate={setCurrentView}
            onDeleteResume={handleDeleteResume}
            onDownloadDocx={handleDownloadDocx}
            onDownloadPdf={handleDownloadPdf}
          />
        );
      case 'experience':
        return (
          <ExperienceManager 
            blocks={blocks} 
            onCreateBlock={handleCreateBlock}
            onUpdateBlock={handleUpdateBlock}
            onDeleteBlock={handleDeleteBlock}
            onPurgeAllData={handlePurgeAllData}
          />
        );
      case 'wizard':
        return (
          <TailorWizard 
            blocks={blocks}
            onSaveResume={handleSaveResume}
            onExportDocx={handleDownloadDocx}
            onExportPdf={handleDownloadPdf}
            apiBaseUrl={API_BASE_URL}
          />
        );
      case 'resumes':
        return (
          <SavedResumes 
            resumes={resumes}
            onDeleteResume={handleDeleteResume}
            onDownloadDocx={handleDownloadDocx}
            onDownloadPdf={handleDownloadPdf}
            onNavigate={setCurrentView}
          />
        );
      default:
        return <div>View not found.</div>;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">👔</span>
          <span className="brand-name">ResumeTailor</span>
        </div>
        
        <nav>
          <ul className="nav-menu">
            <li className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}>
              <button onClick={() => setCurrentView('dashboard')}>
                📊 Dashboard
              </button>
            </li>
            <li className={`nav-item ${currentView === 'experience' ? 'active' : ''}`}>
              <button onClick={() => setCurrentView('experience')}>
                📦 Experience Library
              </button>
            </li>
            <li className={`nav-item ${currentView === 'wizard' ? 'active' : ''}`}>
              <button onClick={() => setCurrentView('wizard')}>
                🤖 Tailor Assistant
              </button>
            </li>
            <li className={`nav-item ${currentView === 'resumes' ? 'active' : ''}`}>
              <button onClick={() => setCurrentView('resumes')}>
                📂 Saved Resumes
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Viewport */}
      <main className="main-viewport">
        {renderView()}
      </main>
    </div>
  );
}

export default App;
