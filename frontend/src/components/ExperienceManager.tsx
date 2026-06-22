import React, { useState, useRef } from 'react';

interface ExperienceBlock {
  id: number;
  title: string;
  organization: string;
  location?: string;
  start_date: string;
  end_date: string;
  description_bullets: string[];
  category: string;
}

interface ExperienceManagerProps {
  blocks: ExperienceBlock[];
  onCreateBlock: (block: Omit<ExperienceBlock, 'id'>) => Promise<any>;
  onUpdateBlock: (id: number, block: Partial<ExperienceBlock>) => Promise<any>;
  onDeleteBlock: (id: number) => Promise<any>;
  onPurgeAllData: () => Promise<void> | void;
}

export const ExperienceManager: React.FC<ExperienceManagerProps> = ({
  blocks,
  onCreateBlock,
  onUpdateBlock,
  onDeleteBlock,
  onPurgeAllData
}) => {
  const [editingBlock, setEditingBlock] = useState<Partial<ExperienceBlock> | null>(null);
  const [bullets, setBullets] = useState<string[]>(['']);
  
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openDialog = (block?: ExperienceBlock) => {
    if (block) {
      setEditingBlock(block);
      setBullets(block.description_bullets.length > 0 ? [...block.description_bullets] : ['']);
    } else {
      setEditingBlock({
        title: '',
        organization: '',
        location: '',
        start_date: '',
        end_date: '',
        category: 'work'
      });
      setBullets(['']);
    }
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
    setEditingBlock(null);
  };

  const handleAddBullet = () => {
    setBullets([...bullets, '']);
  };

  const handleRemoveBullet = (index: number) => {
    const updated = bullets.filter((_, i) => i !== index);
    setBullets(updated.length > 0 ? updated : ['']);
  };

  const handleBulletChange = (index: number, value: string) => {
    const updated = [...bullets];
    updated[index] = value;
    setBullets(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlock) return;

    const cleanBullets = bullets.map(b => b.trim()).filter(b => b.length > 0);

    const blockData = {
      title: editingBlock.title || '',
      organization: editingBlock.organization || '',
      location: editingBlock.location || '',
      start_date: editingBlock.start_date || '',
      end_date: editingBlock.end_date || '',
      category: editingBlock.category || 'work',
      description_bullets: cleanBullets
    };

    if (editingBlock.id) {
      await onUpdateBlock(editingBlock.id, blockData);
    } else {
      await onCreateBlock(blockData);
    }

    closeDialog();
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Manage Experience Blocks</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Add, update, or delete experience blocks. These blocks serve as the library from which you construct resumes.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openDialog()}>
          + Add New Block
        </button>
      </div>

      {blocks.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1.5rem' }}>📦</span>
          <h3 style={{ marginBottom: '0.5rem' }}>Your Experience Library is Empty</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: '400px', marginInline: 'auto' }}>
            To tailor your resume, first create experience blocks for your work, projects, education, or activities.
          </p>
          <button className="btn btn-primary" onClick={() => openDialog()}>
            Create First Block
          </button>
        </div>
      ) : (
        <div className="block-grid" style={{ marginBottom: '3rem' }}>
          {blocks.map((block) => (
            <div key={block.id} className="glass-panel block-card">
              <div className="block-info" style={{ flexGrow: 1, paddingRight: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className={`badge badge-${block.category}`}>{block.category}</span>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{block.title}</h3>
                </div>
                <div className="block-meta">
                  <strong>{block.organization}</strong> 
                  {block.location && ` • ${block.location}`}
                  {` • ${block.start_date} – ${block.end_date}`}
                </div>
                <ul className="block-bullets">
                  {block.description_bullets.map((bullet, idx) => (
                    <li key={idx}>{bullet}</li>
                  ))}
                </ul>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary btn-icon-only" onClick={() => openDialog(block)}>
                  ✏️
                </button>
                <button className="btn btn-danger btn-icon-only" onClick={() => onDeleteBlock(block.id)}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Danger Zone (Security Feature) */}
      <div 
        className="glass-panel" 
        style={{ 
          borderColor: 'rgba(239, 68, 68, 0.3)', 
          background: 'rgba(239, 68, 68, 0.03)', 
          marginTop: '4rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '2rem'
        }}
      >
        <div>
          <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠️</span> Danger Zone
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '600px' }}>
            Purging your data will permanently delete all experience blocks and historical tailored resumes from your local database. This operation is irreversible.
          </p>
        </div>
        <button className="btn btn-danger" onClick={onPurgeAllData}>
          Purge All Local Data
        </button>
      </div>

      {/* Add / Edit Native Dialog */}
      <dialog ref={dialogRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>{editingBlock?.id ? 'Edit Experience Block' : 'Add Experience Block'}</h2>
          <button 
            type="button" 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
            onClick={closeDialog}
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="block-title">Title / Role</label>
              <input 
                id="block-title"
                type="text" 
                required 
                placeholder="e.g. Software Engineering Intern"
                value={editingBlock?.title || ''}
                onChange={e => setEditingBlock({ ...editingBlock, title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="block-org">Organization / Company</label>
              <input 
                id="block-org"
                type="text" 
                required 
                placeholder="e.g. Google"
                value={editingBlock?.organization || ''}
                onChange={e => setEditingBlock({ ...editingBlock, organization: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="block-location">Location (Optional)</label>
              <input 
                id="block-location"
                type="text" 
                placeholder="e.g. Mountain View, CA"
                value={editingBlock?.location || ''}
                onChange={e => setEditingBlock({ ...editingBlock, location: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="block-category">Category</label>
              <select 
                id="block-category"
                value={editingBlock?.category || 'work'}
                onChange={e => setEditingBlock({ ...editingBlock, category: e.target.value })}
              >
                <option value="work">Work Experience</option>
                <option value="project">Project</option>
                <option value="education">Education</option>
                <option value="leadership">Leadership & Activity</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="block-start">Start Date</label>
              <input 
                id="block-start"
                type="text" 
                required 
                placeholder="e.g. June 2025"
                value={editingBlock?.start_date || ''}
                onChange={e => setEditingBlock({ ...editingBlock, start_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="block-end">End Date</label>
              <input 
                id="block-end"
                type="text" 
                required 
                placeholder="e.g. August 2025 or Present"
                value={editingBlock?.end_date || ''}
                onChange={e => setEditingBlock({ ...editingBlock, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span>Bullet Points</span>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ minHeight: '32px', height: '32px', padding: '0 0.75rem', fontSize: '0.8rem' }}
                onClick={handleAddBullet}
              >
                + Add Bullet
              </button>
            </label>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {bullets.map((bullet, index) => (
                <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    required={index === 0}
                    placeholder="e.g. Engineered REST APIs with FastAPI, reducing query latency by 15%."
                    value={bullet}
                    onChange={e => handleBulletChange(index, e.target.value)}
                  />
                  <button 
                    type="button" 
                    className="btn btn-danger btn-icon-only"
                    onClick={() => handleRemoveBullet(index)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={closeDialog}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Block
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
};
