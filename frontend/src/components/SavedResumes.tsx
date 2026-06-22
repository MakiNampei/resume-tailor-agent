import React, { useState } from 'react';

interface Resume {
  id: number;
  job_title: string;
  company: string;
  created_at: string;
  selected_blocks: any[];
  job_description: string;
}

interface SavedResumesProps {
  resumes: Resume[];
  onDeleteResume: (id: number) => void;
  onDownloadDocx: (resume: Resume) => void;
  onDownloadPdf: (resume: Resume) => void;
  onNavigate: (view: string) => void;
}

export const SavedResumes: React.FC<SavedResumesProps> = ({
  resumes,
  onDeleteResume,
  onDownloadDocx,
  onDownloadPdf,
  onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredResumes = resumes.filter(
    (r) =>
      r.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Saved Resumes History</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Review, re-download, or delete tailored resumes generated in the past.
          </p>
        </div>
        {resumes.length > 0 && (
          <button className="btn btn-primary" onClick={() => onNavigate('wizard')}>
            + Tailor New
          </button>
        )}
      </div>

      {resumes.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1.5rem' }}>📁</span>
          <h3 style={{ marginBottom: '0.5rem' }}>No Tailored Resumes Found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '400px', marginInline: 'auto' }}>
            You haven't tailored any resumes yet. Start the process now using the Tailor Assistant.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('wizard')}>
            Launch Assistant
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Search bar */}
          <div className="glass-panel" style={{ padding: '1rem 1.5rem', margin: 0 }}>
            <input
              type="text"
              placeholder="Search resumes by title or company name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.75rem 1rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredResumes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                No results match your search term.
              </p>
            ) : (
              filteredResumes.map((resume) => (
                <div key={resume.id} className="glass-panel block-card" style={{ margin: 0 }}>
                  <div className="block-info" style={{ flexGrow: 1, paddingRight: '2rem' }}>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{resume.job_title}</h3>
                    <div className="block-meta" style={{ marginBottom: '0.75rem' }}>
                      <strong>{resume.company}</strong> &bull; Tailored on {formatDate(resume.created_at)}
                    </div>
                    
                    {/* Collapsible JD snippet */}
                    <details style={{ cursor: 'pointer' }}>
                      <summary style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>
                        View Job Description & Requirements
                      </summary>
                      <div
                        style={{
                          marginTop: '0.75rem',
                          padding: '1rem',
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          color: 'var(--text-muted)',
                          maxHeight: '150px',
                          overflowY: 'auto',
                          whiteSpace: 'pre-wrap',
                          cursor: 'default'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {resume.job_description}
                      </div>
                    </details>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'center' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => onDownloadDocx(resume)}
                      style={{ fontSize: '0.85rem', minHeight: '36px', height: '36px', padding: '0 1rem' }}
                    >
                      Download DOCX
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => onDownloadPdf(resume)}
                      style={{ fontSize: '0.85rem', minHeight: '36px', height: '36px', padding: '0 1rem' }}
                    >
                      Download PDF
                    </button>
                    <button
                      className="btn btn-danger btn-icon-only"
                      onClick={() => onDeleteResume(resume.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
