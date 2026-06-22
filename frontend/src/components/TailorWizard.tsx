import React, { useState } from 'react';

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

interface SelectedBlock {
  block_id: number;
  title: string;
  organization: string;
  location?: string;
  start_date: string;
  end_date: string;
  category: string;
  original_bullets: string[];
  tailored_bullets: string[];
}

interface MatchResult {
  block_id: number;
  relevance_score: number;
  match_reason: string;
  suggested_focus: string;
}

interface ExtractedRequirements {
  skills: Record<string, string[]>;
  experience_requirements: string;
  responsibilities: string[];
  keywords: string[];
}

interface PersonalInfo {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  github: string;
  linkedin: string;
  website: string;
}

interface TailorWizardProps {
  blocks: ExperienceBlock[];
  onSaveResume: (resumeData: any) => Promise<any>;
  onExportDocx: (resumeData: any) => void;
  onExportPdf: (resumeData: any) => void;
  apiBaseUrl: string;
}

export const TailorWizard: React.FC<TailorWizardProps> = ({
  blocks,
  onSaveResume,
  onExportDocx,
  onExportPdf,
  apiBaseUrl
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  // Step 1 State: Target Job
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [requirements, setRequirements] = useState<ExtractedRequirements | null>(null);

  // Step 2 State: Matching
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selectedBlockIds, setSelectedBlockIds] = useState<number[]>([]);

  // Step 3 State: Rewriting & Editing
  const [tailoredBlocks, setTailoredBlocks] = useState<SelectedBlock[]>([]);

  // Step 4 State: Preview & Info
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    full_name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '(555) 019-2834',
    location: 'San Francisco, CA',
    github: 'github.com/janedoe',
    linkedin: 'linkedin.com/in/janedoe',
    website: 'janedoe.me'
  });
  
  const [isSaved, setIsSaved] = useState(false);

  // --- API Handlers ---

  const handleExtractRequirements = async () => {
    if (!jobTitle || !company || !jobDescription) {
      alert("Please fill in Job Title, Company, and Job Description.");
      return;
    }
    
    setLoading(true);
    setLoadingText('AI is extracting job requirements and analyzing skills...');
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/tailor/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title: jobTitle,
          company: company,
          job_description: jobDescription
        })
      });
      
      if (!response.ok) throw new Error("Failed to extract requirements");
      const data = await response.json();
      setRequirements(data);
      
      // Auto match blocks after extraction
      await handleMatchBlocks(data);
      
      setCurrentStep(2);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchBlocks = async (extReqs: ExtractedRequirements) => {
    if (blocks.length === 0) return;
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/tailor/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: jobDescription,
          extracted_requirements: extReqs,
          blocks: blocks
        })
      });
      
      if (!response.ok) throw new Error("Failed to match blocks");
      const data = await response.json();
      setMatches(data.matches);
      
      // Select blocks with > 70 relevance score by default
      const recommendedIds = data.matches
        .filter((m: MatchResult) => m.relevance_score >= 70)
        .map((m: MatchResult) => m.block_id);
      setSelectedBlockIds(recommendedIds.length > 0 ? recommendedIds : [blocks[0].id]);
    } catch (err: any) {
      console.error("Matching failed:", err);
    }
  };

  const handleToggleBlockSelection = (id: number) => {
    if (selectedBlockIds.includes(id)) {
      setSelectedBlockIds(selectedBlockIds.filter(bid => bid !== id));
    } else {
      setSelectedBlockIds([...selectedBlockIds, id]);
    }
  };

  const handleRewriteBullets = async () => {
    if (selectedBlockIds.length === 0) {
      alert("Please select at least one experience block to include.");
      return;
    }
    
    setLoading(true);
    setLoadingText('AI is tailoring your bullet points for the target role...');
    
    const activeBlocks = blocks.filter(b => selectedBlockIds.includes(b.id));
    const rewrittenList: SelectedBlock[] = [];
    
    try {
      for (const block of activeBlocks) {
        const response = await fetch(`${apiBaseUrl}/api/tailor/rewrite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            block_id: block.id,
            title: block.title,
            organization: block.organization,
            original_bullets: block.description_bullets,
            job_description: jobDescription,
            extracted_requirements: requirements
          })
        });
        
        if (!response.ok) throw new Error(`Failed to rewrite block: ${block.title}`);
        const data = await response.json();
        
        rewrittenList.push({
          block_id: block.id,
          title: block.title,
          organization: block.organization,
          location: block.location,
          start_date: block.start_date,
          end_date: block.end_date,
          category: block.category,
          original_bullets: block.description_bullets,
          tailored_bullets: data.tailored_bullets
        });
      }
      
      setTailoredBlocks(rewrittenList);
      setCurrentStep(3);
    } catch (err: any) {
      alert("Error rewriting bullets: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTailoredBullet = (blockIdx: number, bulletIdx: number, val: string) => {
    const updated = [...tailoredBlocks];
    updated[blockIdx].tailored_bullets[bulletIdx] = val;
    setTailoredBlocks(updated);
  };

  const getFullResumePayload = () => {
    return {
      job_title: jobTitle,
      company: company,
      job_description: jobDescription,
      extracted_requirements: requirements || {},
      selected_blocks: tailoredBlocks,
      personal_info: personalInfo
    };
  };

  const handleSave = async () => {
    const payload = getFullResumePayload();
    try {
      await onSaveResume(payload);
      setIsSaved(true);
      alert("Resume tailored instance saved successfully!");
    } catch (err: any) {
      alert("Save failed: " + err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to group tailored blocks for preview
  const groupedTailored = tailoredBlocks.reduce((acc, block) => {
    const cat = block.category.toLowerCase();
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(block);
    return acc;
  }, {} as Record<string, SelectedBlock[]>);

  const categoriesOrdered = ["education", "work", "project", "leadership"];
  const catNames: Record<string, string> = {
    education: "EDUCATION",
    work: "WORK EXPERIENCE",
    project: "PROJECTS & EXPERIENCES",
    leadership: "LEADERSHIP & ACTIVITIES"
  };

  return (
    <div className="fade-in">
      {/* Step Indicator Header */}
      <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '2rem' }}>
        <div className="wizard-steps">
          <div className={`step-node ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            1
            <span className="step-label">Target Job</span>
          </div>
          <div className={`step-node ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            2
            <span className="step-label">AI Matcher</span>
          </div>
          <div className={`step-node ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
            3
            <span className="step-label">Bullet Editor</span>
          </div>
          <div className={`step-node ${currentStep >= 4 ? 'active' : ''} ${currentStep > 4 ? 'completed' : ''}`}>
            4
            <span className="step-label">Preview & Export</span>
          </div>
        </div>
      </div>

      {/* Loading overlay for AI tasks */}
      {loading && (
        <div className="glass-panel scanning-container fade-in">
          <div className="scanning-bar"></div>
          <div className="pulse-circle">🤖</div>
          <h3>{loadingText}</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>This can take a few seconds...</p>
        </div>
      )}

      {/* Step 1: Input Job Details */}
      {!loading && currentStep === 1 && (
        <div className="glass-panel fade-in">
          <h2>Step 1: Paste Target Job Details</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Provide the details of the job you want to apply to. The AI agent will parse this description to extract keywords, skills, and requirements.
          </p>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="job-title">Job Title</label>
              <input 
                id="job-title"
                type="text" 
                placeholder="e.g. Software Engineer Intern" 
                value={jobTitle} 
                onChange={e => setJobTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="target-company">Company</label>
              <input 
                id="target-company"
                type="text" 
                placeholder="e.g. Google" 
                value={company} 
                onChange={e => setCompany(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="job-desc">Job Description</label>
            <textarea 
              id="job-desc"
              placeholder="Paste the full job description text here..."
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button className="btn btn-primary" onClick={handleExtractRequirements}>
              Extract Requirements &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 2: AI Matching & Selection */}
      {!loading && currentStep === 2 && (
        <div className="fade-in">
          <div className="dashboard-grid">
            {/* Left side: Blocks List */}
            <div className="glass-panel" style={{ margin: 0 }}>
              <h2>Step 2: Match Experience Blocks</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Select the experience blocks you wish to compile into your resume. The AI matched and scored them by relevance.
              </p>

              {blocks.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <p>You have no saved experience blocks.</p>
                  <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setCurrentStep(1)}>
                    Back
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {blocks.map(block => {
                    const match = matches.find(m => m.block_id === block.id);
                    const score = match ? match.relevance_score : 50;
                    const isSelected = selectedBlockIds.includes(block.id);

                    return (
                      <div 
                        key={block.id} 
                        className={`match-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleBlockSelection(block.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => {}} // Controlled by card click
                          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <span className={`badge badge-${block.category}`}>{block.category}</span>
                            <h4 style={{ margin: 0 }}>{block.title}</h4>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            {block.organization} &bull; {block.start_date} – {block.end_date}
                          </div>
                          {match && (
                            <div style={{ fontSize: '0.85rem', color: '#818cf8', borderLeft: '2px solid var(--primary)', paddingLeft: '0.5rem' }}>
                              <strong>AI Assessment:</strong> {match.match_reason}
                            </div>
                          )}
                        </div>
                        <div className="match-score">
                          <span className="match-score-value">{score}%</span>
                          <span className="match-score-label">Match</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                <button className="btn btn-secondary" onClick={() => setCurrentStep(1)}>
                  &larr; Back
                </button>
                <button 
                  className="btn btn-primary" 
                  disabled={selectedBlockIds.length === 0}
                  onClick={handleRewriteBullets}
                >
                  Tailor Bullets &rarr;
                </button>
              </div>
            </div>

            {/* Right side: Extracted Requirements Display */}
            {requirements && (
              <div className="glass-panel" style={{ margin: 0, height: 'fit-content' }}>
                <h3>Extracted Target Profile</h3>
                <div style={{ marginTop: '1.25rem' }}>
                  <label>Experience Required</label>
                  <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem', color: 'var(--text-muted)' }}>
                    {requirements.experience_requirements}
                  </p>

                  <label>Extracted Keywords</label>
                  <div className="extracted-badge-container" style={{ marginBottom: '1.25rem' }}>
                    {requirements.keywords.map((kw, idx) => (
                      <span key={idx} className="extracted-badge">{kw}</span>
                    ))}
                  </div>

                  <label>Core Responsibilities</label>
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {requirements.responsibilities.map((resp, idx) => (
                      <li key={idx} style={{ marginBottom: '0.5rem' }}>{resp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Bullet Editing & Refinement */}
      {!loading && currentStep === 3 && (
        <div className="glass-panel fade-in">
          <h2>Step 3: Refine AI-Tailored Bullet Points</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Review the side-by-side comparison. You can directly edit the tailored bullets on the right to polish the wording.
          </p>

          {tailoredBlocks.map((block, blockIdx) => (
            <div key={block.block_id} className="tailor-editor-block">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className={`badge badge-${block.category}`}>{block.category}</span>
                <h4 style={{ margin: 0 }}>{block.title} | <span style={{ fontWeight: 'normal', fontStyle: 'italic' }}>{block.organization}</span></h4>
              </div>
              
              <div className="tailor-editor-grid">
                {/* Original */}
                <div className="bullet-column">
                  <label>Original Bullets</label>
                  {block.original_bullets.map((bullet, idx) => (
                    <div key={idx} className="bullet-box-original">{bullet}</div>
                  ))}
                </div>
                
                {/* Tailored */}
                <div className="bullet-column">
                  <label style={{ color: 'var(--secondary)' }}>Tailored Bullets (Editable)</label>
                  {block.tailored_bullets.map((bullet, idx) => (
                    <div key={idx} className="bullet-box-tailored">
                      <input 
                        type="text" 
                        value={bullet} 
                        onChange={e => handleEditTailoredBullet(blockIdx, idx, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
            <button className="btn btn-secondary" onClick={() => setCurrentStep(2)}>
              &larr; Back
            </button>
            <button className="btn btn-primary" onClick={() => setCurrentStep(4)}>
              Preview Resume &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Preview & Export */}
      {!loading && currentStep === 4 && (
        <div className="fade-in">
          <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
            {/* Left Column: Personal Info Form */}
            <div className="glass-panel" style={{ margin: 0, height: 'fit-content' }}>
              <h3>Resume Info</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Fill out your details to populate the resume header sheet.
              </p>

              <div className="form-group">
                <label htmlFor="info-name">Full Name</label>
                <input 
                  id="info-name"
                  type="text" 
                  value={personalInfo.full_name} 
                  onChange={e => setPersonalInfo({...personalInfo, full_name: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label htmlFor="info-email">Email</label>
                <input 
                  id="info-email"
                  type="email" 
                  value={personalInfo.email} 
                  onChange={e => setPersonalInfo({...personalInfo, email: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label htmlFor="info-phone">Phone Number</label>
                <input 
                  id="info-phone"
                  type="text" 
                  value={personalInfo.phone} 
                  onChange={e => setPersonalInfo({...personalInfo, phone: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label htmlFor="info-loc">Location</label>
                <input 
                  id="info-loc"
                  type="text" 
                  value={personalInfo.location} 
                  onChange={e => setPersonalInfo({...personalInfo, location: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label htmlFor="info-li">LinkedIn</label>
                <input 
                  id="info-li"
                  type="text" 
                  value={personalInfo.linkedin} 
                  onChange={e => setPersonalInfo({...personalInfo, linkedin: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label htmlFor="info-gh">GitHub</label>
                <input 
                  id="info-gh"
                  type="text" 
                  value={personalInfo.github} 
                  onChange={e => setPersonalInfo({...personalInfo, github: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label htmlFor="info-web">Website</label>
                <input 
                  id="info-web"
                  type="text" 
                  value={personalInfo.website} 
                  onChange={e => setPersonalInfo({...personalInfo, website: e.target.value})}
                />
              </div>
            </div>

            {/* Right Column: Sheet Preview & Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Toolbar */}
              <div className="glass-panel" style={{ margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" onClick={() => setCurrentStep(3)}>
                    &larr; Edit Bullets
                  </button>
                  <button className="btn btn-success" onClick={handleSave} disabled={isSaved}>
                    {isSaved ? '✓ Saved' : 'Save Instance'}
                  </button>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" onClick={() => onExportDocx(getFullResumePayload())}>
                    Download DOCX
                  </button>
                  <button className="btn btn-primary" onClick={() => onExportPdf(getFullResumePayload())}>
                    Download PDF
                  </button>
                  <button className="btn btn-secondary" onClick={handlePrint}>
                    Print/Save PDF 🖨️
                  </button>
                </div>
              </div>

              {/* Sheet Visual Preview */}
              <div className="resume-preview-wrapper">
                <div className="resume-preview-sheet">
                  {/* Header */}
                  <div className="resume-sheet-header">
                    <div className="resume-sheet-name">{personalInfo.full_name || 'Your Name'}</div>
                    <div className="resume-sheet-contact">
                      {[
                        personalInfo.email,
                        personalInfo.phone,
                        personalInfo.location
                      ].filter(Boolean).join('  |  ')}
                      { (personalInfo.github || personalInfo.linkedin || personalInfo.website) && (
                        <div style={{ marginTop: '2pt' }}>
                          {[
                            personalInfo.linkedin && `LinkedIn: ${personalInfo.linkedin}`,
                            personalInfo.github && `GitHub: ${personalInfo.github}`,
                            personalInfo.website
                          ].filter(Boolean).join('  |  ')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grouped Sections */}
                  {categoriesOrdered.map(cat => {
                    const catBlocks = groupedTailored[cat];
                    if (!catBlocks || catBlocks.length === 0) return null;

                    return (
                      <div key={cat}>
                        <div className="resume-sheet-section-title">{catNames[cat]}</div>
                        {catBlocks.map((b, idx) => (
                          <div key={idx} className="resume-sheet-block">
                            <div className="resume-sheet-block-header">
                              <div>
                                {b.title} <span className="resume-sheet-block-org">| {b.organization}</span>
                                {b.location && <span style={{ fontWeight: 'normal', fontStyle: 'italic', fontSize: '9.5pt' }}>, {b.location}</span>}
                              </div>
                              <div style={{ fontSize: '9.5pt', fontWeight: 'normal' }}>
                                {b.start_date} – {b.end_date}
                              </div>
                            </div>
                            <ul className="resume-sheet-bullets">
                              {b.tailored_bullets.map((bullet, bulletIdx) => (
                                <li key={bulletIdx}>{bullet}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
