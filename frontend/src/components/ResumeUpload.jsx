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
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Resume Intelligence
        </h2>
        <p className="text-slate-400">
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
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
            dragActive
              ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx"
            onChange={handleChange}
          />
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl animate-bounce">
              📄
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Drag & drop your resume here</p>
              <p className="text-sm text-slate-400 mt-1">or click to browse from your device</p>
            </div>
            <div className="pt-2">
              <span className="text-xs text-slate-500 px-3 py-1 bg-slate-950/60 rounded-full border border-slate-800">
                PDF, DOCX up to 10MB
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Loading Animation State */}
      {loading && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 flex flex-col items-center justify-center space-y-6 shadow-xl backdrop-blur-md">
          {/* Circular Spinner */}
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-purple-500 animate-spin"></div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-white">Analyzing Resume</h3>
            <p className="text-sm text-indigo-400 font-mono animate-pulse">{loadingStep}</p>
          </div>
          {/* Progress loader bar */}
          <div className="w-64 h-1.5 bg-slate-950 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-[loading_10s_ease-in-out_infinite] w-2/3 rounded-full"></div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-3 text-rose-300 text-sm">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-semibold">Upload Failed</p>
            <p className="opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Parsed Profile Display */}
      {profile && !loading && (
        <div className="space-y-6 animate-fade-in">
          {/* Action Row */}
          <div className="flex justify-between items-center bg-slate-900/40 p-4 border border-slate-800 rounded-xl">
            <div className="text-sm text-slate-400">
              Successfully parsed resume on {new Date(profile.created_at).toLocaleDateString()}
            </div>
            <button
              onClick={() => {
                onUploadSuccess(null);
                setError(null);
              }}
              className="text-xs font-semibold px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
            >
              Upload Different Resume
            </button>
          </div>

          {/* Grid Layout: Left Column Details, Right Column Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Info (Col-span 2) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Experience Card */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-md">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <span className="mr-3">💼</span> Work Experience
                </h3>
                {profile.experience && profile.experience.length > 0 ? (
                  <div className="space-y-6 relative border-l border-slate-800 pl-6 ml-3">
                    {profile.experience.map((exp, idx) => (
                      <div key={idx} className="relative group">
                        {/* Timeline point */}
                        <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-slate-900 group-hover:bg-purple-500 transition-colors"></div>
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div>
                            <h4 className="font-bold text-white text-base">{exp.role}</h4>
                            <p className="text-sm text-indigo-400 font-medium">{exp.company}</p>
                          </div>
                          <span className="text-xs text-slate-500 font-medium px-2.5 py-1 bg-slate-950/40 rounded-full border border-slate-800/80">
                            {exp.duration}
                          </span>
                        </div>
                        {exp.highlights && exp.highlights.length > 0 && (
                          <ul className="list-disc list-outside ml-4 mt-3 text-sm text-slate-400 space-y-1.5">
                            {exp.highlights.map((bullet, bidx) => (
                              <li key={bidx}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No work experience extracted.</p>
                )}
              </div>

              {/* Projects Card */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-md">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <span className="mr-3">⚙️</span> Projects
                </h3>
                {profile.projects && profile.projects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.projects.map((proj, idx) => (
                      <div key={idx} className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700/60 transition-all duration-200">
                        <div>
                          <h4 className="font-bold text-white text-sm mb-2">{proj.name}</h4>
                          <p className="text-xs text-slate-400 leading-relaxed mb-4">{proj.description}</p>
                        </div>
                        {proj.tech && proj.tech.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-900">
                            {proj.tech.map((t, tidx) => (
                              <span key={tidx} className="text-[10px] bg-slate-900 border border-slate-800 text-indigo-400 font-medium px-2 py-0.5 rounded">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No projects extracted.</p>
                )}
              </div>

            </div>

            {/* Sidebar Details (Col-span 1) */}
            <div className="space-y-6">
              
              {/* Profile Links & Metadata */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-white mb-4">Contact & Links</h3>
                <div className="space-y-3">
                  {profile.links?.linkedin && (
                    <a
                      href={profile.links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 rounded-xl bg-slate-950/40 hover:bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition group text-sm"
                    >
                      <span className="text-lg">🔗</span>
                      <div className="truncate">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase leading-none mb-0.5">LinkedIn</p>
                        <p className="truncate text-xs">{profile.links.linkedin}</p>
                      </div>
                    </a>
                  )}
                  {profile.links?.github && (
                    <a
                      href={profile.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 rounded-xl bg-slate-950/40 hover:bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition group text-sm"
                    >
                      <span className="text-lg">🐙</span>
                      <div className="truncate">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase leading-none mb-0.5">GitHub</p>
                        <p className="truncate text-xs">{profile.links.github}</p>
                      </div>
                    </a>
                  )}
                  {profile.links?.portfolio && (
                    <a
                      href={profile.links.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 rounded-xl bg-slate-950/40 hover:bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition group text-sm"
                    >
                      <span className="text-lg">🌐</span>
                      <div className="truncate">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase leading-none mb-0.5">Portfolio</p>
                        <p className="truncate text-xs">{profile.links.portfolio}</p>
                      </div>
                    </a>
                  )}
                  {(!profile.links?.linkedin && !profile.links?.github && !profile.links?.portfolio) && (
                    <p className="text-xs text-slate-500 italic">No links extracted.</p>
                  )}
                </div>
              </div>

              {/* Skills Card */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                  <span className="mr-2">💡</span> Skills
                </h3>
                {profile.skills && profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold px-3 py-1 rounded-lg"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No skills extracted.</p>
                )}
              </div>

              {/* Education Card */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-md">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                  <span className="mr-2">🎓</span> Education
                </h3>
                {profile.education && profile.education.length > 0 ? (
                  <div className="space-y-4">
                    {profile.education.map((edu, idx) => (
                      <div key={idx} className="border-l-2 border-indigo-500/40 pl-3">
                        <h4 className="font-bold text-white text-xs">{edu.degree}</h4>
                        <p className="text-[11px] text-slate-400">{edu.institution}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{edu.year}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No education history extracted.</p>
                )}
              </div>

              {/* Certifications Card */}
              {profile.certifications && profile.certifications.length > 0 && (
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-md">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <span className="mr-2">🎗️</span> Certifications
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.certifications.map((cert, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold px-2.5 py-1 rounded-md"
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
