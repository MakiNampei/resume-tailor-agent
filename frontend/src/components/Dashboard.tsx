import React from 'react';

interface Resume {
  id: number;
  job_title: string;
  company: string;
  created_at: string;
  selected_blocks: any[];
}

interface DashboardProps {
  resumes: Resume[];
  blocksCount: number;
  onNavigate: (view: string) => void;
  onDeleteResume: (id: number) => void;
  onDownloadDocx: (resume: Resume) => void;
  onDownloadPdf: (resume: Resume) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  resumes,
  blocksCount,
  onNavigate,
  onDeleteResume,
  onDownloadDocx,
  onDownloadPdf
}) => {
  
  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Tailor Your Resume with AI</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Create tailored, ATS-friendly resume bullet points in seconds for any target job description.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-value">{blocksCount}</div>
          <div className="stat-label">Experience Blocks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{resumes.length}</div>
          <div className="stat-label">Resumes Tailored</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">100%</div>
          <div className="stat-label">ATS Friendly</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Recent Resumes */}
        <div className="glass-panel" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>Recent Tailored Resumes</h3>
            <button className="btn btn-primary" onClick={() => onNavigate('wizard')}>
              + Tailor New Resume
            </button>
          </div>

          {resumes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>📄</span>
              <p style={{ marginBottom: '1rem' }}>No tailored resumes yet.</p>
              <button className="btn btn-secondary" onClick={() => onNavigate('wizard')}>
                Get Started
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {resumes.map((resume) => (
                <div key={resume.id} className="block-card">
                  <div className="block-info">
                    <h4>{resume.job_title}</h4>
                    <div className="block-meta">
                      <strong>{resume.company}</strong> &bull; Tailored on {formatDate(resume.created_at)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Included {resume.selected_blocks?.length || 0} experience blocks
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-secondary btn-icon-only" 
                      title="Download DOCX"
                      onClick={() => onDownloadDocx(resume)}
                    >
                      📝
                    </button>
                    <button 
                      className="btn btn-secondary btn-icon-only" 
                      title="Download PDF"
                      onClick={() => onDownloadPdf(resume)}
                    >
                      📕
                    </button>
                    <button 
                      className="btn btn-danger btn-icon-only" 
                      title="Delete Resume"
                      onClick={() => onDeleteResume(resume.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Tips */}
        <div className="glass-panel" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3>AI Tailoring Guide</h3>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.5rem', background: 'rgba(99,102,241,0.1)', padding: '0.5rem', borderRadius: '8px' }}>1</span>
            <div>
              <h5 style={{ marginBottom: '0.25rem' }}>Save Experience Blocks</h5>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Add your experiences once. We support Education, Work, Projects, and Activities.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.5rem', background: 'rgba(16,185,129,0.1)', padding: '0.5rem', borderRadius: '8px' }}>2</span>
            <div>
              <h5 style={{ marginBottom: '0.25rem' }}>Paste Job Description</h5>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Input the JD of your target role. Our AI agent extracts key requirements and skills.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.5rem', background: 'rgba(245,158,11,0.1)', padding: '0.5rem', borderRadius: '8px' }}>3</span>
            <div>
              <h5 style={{ marginBottom: '0.25rem' }}>Match & Rewrite</h5>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                AI scores relevance, matches the best blocks, and rewrites bullet points with target keywords.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.5rem', background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: '8px' }}>4</span>
            <div>
              <h5 style={{ marginBottom: '0.25rem' }}>Export ATS-Safe Files</h5>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Download clean, professional single-column resumes in DOCX or PDF format.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
