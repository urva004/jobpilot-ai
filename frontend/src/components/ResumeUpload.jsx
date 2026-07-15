import React, { useState, useRef } from 'react';

const ResumeUpload = ({ profile, onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const steps = [
    'Reading resume file...',
    'Extracting raw text contents...',
    'Sending to Mistral AI for analysis...',
    'Structuring experience, education, & projects...',
    'Identifying links & technical skills...',
    'Saving candidate profile to SQLite database...'
  ];

  const simulateLoading = (callback) => {
    let index = 0;
    setLoading(true);
    setError(null);
    setLoadingStep(steps[0]);

    const interval = setInterval(() => {
      index++;
      if (index < steps.length) {
        setLoadingStep(steps[index]);
      } else {
        clearInterval(interval);
      }
    }, 1200);

    return () => clearInterval(interval);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const uploadFile = async (file) => {
    const fileType = file.name.split('.').pop().toLowerCase();
    if (fileType !== 'pdf' && fileType !== 'docx') {
      setError('Unsupported file type. Please upload a PDF or DOCX file.');
      return;
    }

    const cancelSimulation = simulateLoading();
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/resume/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload and parse resume.');
      }

      const data = await response.json();
      onUploadSuccess(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during upload.');
    } finally {
      cancelSimulation();
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      {/* Page Header */}
      <div className="mb-10 text-left animate-fadeIn">
        <h2 className="text-3xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Resume Intelligence
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Upload your resume in PDF or DOCX format to parse and extract your skills, projects, and work history using Mistral AI.
        </p>
      </div>

      {/* Upload Zone */}
      {!profile && !loading && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          className="relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300"
          style={{
            background: dragActive ? 'var(--accent-soft)' : 'var(--bg-glass)',
            borderColor: dragActive ? 'var(--accent)' : 'var(--border)',
            boxShadow: dragActive ? 'var(--shadow-glow)' : 'var(--shadow-sm)'
          }}
          onMouseEnter={(e) => {
            if (!dragActive) {
              e.currentTarget.style.borderColor = 'var(--accent-hover)';
              e.currentTarget.style.background = 'var(--bg-glass-hover)';
            }
          }}
          onMouseLeave={(e) => {
            if (!dragActive) {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--bg-glass)';
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx"
            onChange={handleChange}
          />
          <div className="flex flex-col items-center justify-center space-y-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl float-anim border shadow-sm transition-colors"
              style={{
                background: 'var(--accent-soft)',
                borderColor: 'var(--border)',
              }}
            >
              📄
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Drag & drop your resume here</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>or click to browse from your device</p>
            </div>
            <div className="pt-2">
              <span className="text-xs px-3 py-1 rounded-full border"
                    style={{
                      background: 'var(--bg-glass)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-secondary)'
                    }}>
                PDF, DOCX up to 10MB
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Loading Animation State */}
      {loading && (
        <div className="glass-card p-12 flex flex-col items-center justify-center space-y-6 shadow-xl text-center">
          {/* Circular Spinner */}
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4" style={{ borderColor: 'var(--border-subtle)' }}></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-purple-500 animate-spin"></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Analyzing Resume</h3>
            <p className="text-sm font-mono animate-pulse" style={{ color: 'var(--text-link)' }}>{loadingStep}</p>
          </div>
          {/* Progress loader bar */}
          <div className="w-64 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-[loading_10s_ease-in-out_infinite] w-2/3 rounded-full"></div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-3 text-rose-300 text-sm animate-fadeIn">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-bold">Upload Failed</p>
            <p className="opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Parsed Profile Display */}
      {profile && !loading && (
        <div className="space-y-6">
          {/* Action Row */}
          <div className="flex justify-between items-center p-4 border rounded-xl glass-card entrance-anim">
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Successfully parsed resume on {new Date(profile.created_at).toLocaleDateString()}
            </div>
            <button
              onClick={() => {
                onUploadSuccess(null);
                setError(null);
              }}
              className="btn-secondary"
            >
              Upload Different Resume
            </button>
          </div>

          {/* Grid Layout: Left Column Details, Right Column Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Info (Col-span 2) */}
            <div className="lg:col-span-2 flex flex-col space-y-6">
              
              {/* Experience Card */}
              <div className="glass-card p-6 shadow-md entrance-anim delay-100">
                <h3 className="text-xl font-bold mb-6 flex items-center" style={{ color: 'var(--text-primary)' }}>
                  <span className="mr-3">💼</span> Work Experience
                </h3>
                {profile.experience && profile.experience.length > 0 ? (
                  <div className="space-y-6 relative ml-3">
                    {profile.experience.map((exp, idx) => (
                      <div key={idx} className="relative pl-6 pb-6 last:pb-0 group">
                        {/* Connecting vertical line */}
                        {idx < profile.experience.length - 1 && (
                          <div
                            className="absolute left-[5px] top-4 bottom-0 w-0.5"
                            style={{ background: 'var(--border)' }}
                          />
                        )}
                        {/* Timeline point */}
                        <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full border-2 transition-colors"
                             style={{
                               background: 'var(--bg-base)',
                               borderColor: 'var(--accent)'
                             }}></div>
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div>
                            <h4 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{exp.role}</h4>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-link)' }}>{exp.company}</p>
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                                style={{
                                  background: 'var(--bg-glass)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--text-secondary)'
                                }}>
                            {exp.duration}
                          </span>
                        </div>
                        {exp.highlights && exp.highlights.length > 0 && (
                          <ul className="list-disc list-outside ml-4 mt-3 text-sm space-y-1.5" style={{ color: 'var(--text-secondary)' }}>
                            {exp.highlights.map((bullet, bidx) => (
                              <li key={bidx}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No work experience extracted.</p>
                )}
              </div>

              {/* Projects Card */}
              <div className="glass-card p-6 shadow-md entrance-anim delay-150 flex-grow flex flex-col">
                <h3 className="text-xl font-bold mb-6 flex items-center" style={{ color: 'var(--text-primary)' }}>
                  <span className="mr-3">⚙️</span> Projects
                </h3>
                {profile.projects && profile.projects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
                    {profile.projects.map((proj, idx) => (
                      <div key={idx} className="border p-4 rounded-xl flex flex-col justify-between hover-lift transition-all duration-200"
                           style={{
                             background: 'var(--bg-glass)',
                             borderColor: 'var(--border)'
                           }}>
                        <div>
                          <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>{proj.name}</h4>
                          <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{proj.description}</p>
                        </div>
                        {proj.tech && proj.tech.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                            {proj.tech.map((t, tidx) => (
                              <span key={tidx} className="text-[9px] border font-bold px-2 py-0.5 rounded"
                                    style={{
                                      background: 'var(--accent-soft)',
                                      borderColor: 'var(--border)',
                                      color: 'var(--text-link)'
                                    }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No projects extracted.</p>
                )}
              </div>

            </div>

            {/* Sidebar Details (Col-span 1) */}
            <div className="flex flex-col space-y-6">
              
              {/* Profile Links & Metadata */}
              <div className="glass-card p-6 shadow-md entrance-anim delay-200">
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Contact & Links</h3>
                <div className="space-y-3">
                  {profile.links?.linkedin && (
                    <a
                      href={profile.links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 rounded-xl hover-lift border text-sm transition"
                      style={{
                        background: 'var(--bg-glass)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <span className="text-lg">🔗</span>
                      <div className="truncate">
                        <p className="text-[9px] font-bold uppercase leading-none mb-1" style={{ color: 'var(--text-muted)' }}>LinkedIn</p>
                        <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-link)' }}>{profile.links.linkedin}</p>
                      </div>
                    </a>
                  )}
                  {profile.links?.github && (
                    <a
                      href={profile.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 rounded-xl hover-lift border text-sm transition"
                      style={{
                        background: 'var(--bg-glass)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <span className="text-lg">🐙</span>
                      <div className="truncate">
                        <p className="text-[9px] font-bold uppercase leading-none mb-1" style={{ color: 'var(--text-muted)' }}>GitHub</p>
                        <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-link)' }}>{profile.links.github}</p>
                      </div>
                    </a>
                  )}
                  {profile.links?.portfolio && (
                    <a
                      href={profile.links.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 rounded-xl hover-lift border text-sm transition"
                      style={{
                        background: 'var(--bg-glass)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <span className="text-lg">🌐</span>
                      <div className="truncate">
                        <p className="text-[9px] font-bold uppercase leading-none mb-1" style={{ color: 'var(--text-muted)' }}>Portfolio</p>
                        <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-link)' }}>{profile.links.portfolio}</p>
                      </div>
                    </a>
                  )}
                  {(!profile.links?.linkedin && !profile.links?.github && !profile.links?.portfolio) && (
                    <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No links extracted.</p>
                  )}
                </div>
              </div>

              {/* Skills Card */}
              <div className="glass-card p-6 shadow-md entrance-anim delay-250">
                <h3 className="text-lg font-bold mb-4 flex items-center" style={{ color: 'var(--text-primary)' }}>
                  <span className="mr-2">💡</span> Skills
                </h3>
                {profile.skills && profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, idx) => {
                      const skillsConfidence = profile.confidence?.skills || 0.8;
                      const primaryCount = Math.ceil(profile.skills.length * skillsConfidence);
                      const isPrimary = idx < primaryCount;
                      return (
                        <span
                          key={idx}
                          className="text-xs font-semibold px-3 py-1 rounded-lg border transition-all duration-200"
                          style={{
                            background: isPrimary ? 'var(--accent)' : 'var(--accent-soft)',
                            borderColor: 'var(--border)',
                            color: isPrimary ? 'white' : 'var(--text-link)',
                            boxShadow: isPrimary ? '0 2px 8px rgba(99, 102, 241, 0.2)' : 'none'
                          }}
                        >
                          {skill}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No skills extracted.</p>
                )}
              </div>

              {/* Education Card */}
              <div className={`glass-card p-6 shadow-md entrance-anim delay-300 flex flex-col ${(!profile.certifications || profile.certifications.length === 0) ? 'flex-grow' : ''}`}>
                <h3 className="text-lg font-bold mb-4 flex items-center" style={{ color: 'var(--text-primary)' }}>
                  <span className="mr-2">🎓</span> Education
                </h3>
                {profile.education && profile.education.length > 0 ? (
                  <div className="space-y-4 flex-grow">
                    {profile.education.map((edu, idx) => (
                      <div key={idx} className="border-l-2 pl-3" style={{ borderColor: 'var(--accent)' }}>
                        <h4 className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{edu.degree}</h4>
                        <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{edu.institution}</p>
                        <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{edu.year}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No education history extracted.</p>
                )}
              </div>

              {/* Certifications Card */}
              {profile.certifications && profile.certifications.length > 0 && (
                <div className="glass-card p-6 shadow-md entrance-anim delay-350 flex-grow flex flex-col">
                  <h3 className="text-lg font-bold mb-4 flex items-center" style={{ color: 'var(--text-primary)' }}>
                    <span className="mr-2">🎗️</span> Certifications
                  </h3>
                  <div className="flex flex-wrap gap-1.5 flex-grow content-start">
                    {profile.certifications.map((cert, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-md border self-start"
                        style={{
                          background: 'rgba(52, 211, 153, 0.08)',
                          borderColor: 'rgba(52, 211, 153, 0.20)',
                          color: '#34d399'
                        }}
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
