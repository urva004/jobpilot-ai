import React, { useState } from 'react';
import EmailApply from './EmailApply';

const JobSearch = () => {
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [activeEmailJob, setActiveEmailJob] = useState(null);

  // Store matching analysis state per job: { [jobId]: { loading, data, error } }
  const [matchAnalyses, setMatchAnalyses] = useState({});

  const [selectedExp, setSelectedExp] = useState('any');

  const getExperienceBadge = (level) => {
    switch (level) {
      case 'fresher':
        return { label: 'Fresher (0-1 yrs)', style: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' };
      case '1_2_years':
        return { label: '1-2 Years', style: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' };
      case '3_5_years':
        return { label: '3-5 Years', style: 'bg-amber-500/10 border-amber-500/20 text-amber-300' };
      case '5_plus_years':
        return { label: 'Senior (5+ yrs)', style: 'bg-purple-500/10 border-purple-500/20 text-purple-300' };
      default:
        return { label: 'Experience Unspecified', style: 'bg-slate-800/40 border-slate-700/40 text-slate-400' };
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setExpandedJobId(null);

    try {
      const response = await fetch('http://localhost:8000/jobs/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords, location, remote }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch job search results.');
      }

      const data = await response.json();
      setJobs(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during search.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandJob = (id) => {
    if (expandedJobId === id) {
      setExpandedJobId(null);
    } else {
      setExpandedJobId(id);
    }
  };

  const handleComputeMatch = async (jobId) => {
    // Set loading state for this specific job
    setMatchAnalyses((prev) => ({
      ...prev,
      [jobId]: { loading: true, data: null, error: null }
    }));

    try {
      const response = await fetch('http://localhost:8000/jobs/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job_id: jobId }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to compute match analysis.');
      }

      const data = await response.json();
      setMatchAnalyses((prev) => ({
        ...prev,
        [jobId]: { loading: false, data, error: null }
      }));
    } catch (err) {
      console.error(err);
      setMatchAnalyses((prev) => ({
        ...prev,
        [jobId]: { loading: false, data: null, error: err.message }
      }));
    }
  };

  const getMatchScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400 stroke-emerald-400';
    if (score >= 60) return 'text-amber-400 stroke-amber-400';
    return 'text-rose-400 stroke-rose-400';
  };

  const getMatchLevel = (score) => {
    if (score >= 80) return { label: 'Excellent Match', bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' };
    if (score >= 60) return { label: 'Good Fit', bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300' };
    return { label: 'Fair Fit', bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300' };
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      {/* Page Header */}
      <div className="mb-10 text-left animate-fadeIn">
        <h2 className="text-3xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Job Discovery & Match
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Find matching jobs across Adzuna and JSearch, then compute a semantic gap analysis using local vector representations and Mistral AI.
        </p>
      </div>

      <form onSubmit={handleSearch} className="glass-card p-8 mb-8 shadow-lg animate-fadeIn border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          {/* Keywords input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Keywords</label>
            <div className="input-icon-wrapper">
              <span className="input-icon text-slate-500">🔍</span>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. Python Developer, React..."
                className="input-base"
                required
              />
            </div>
          </div>

          {/* Location input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Location</label>
            <div className="input-icon-wrapper">
              <span className="input-icon text-slate-500">📍</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bangalore, Remote, India..."
                className="input-base"
              />
            </div>
          </div>

          {/* Experience Level filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Experience Level</label>
            <div className="input-icon-wrapper">
              <span className="input-icon text-slate-500">💼</span>
              <select
                value={selectedExp}
                onChange={(e) => setSelectedExp(e.target.value)}
                className="input-base pr-8 cursor-pointer appearance-none"
              >
                <option value="any" style={{ color: 'black' }}>Any Experience</option>
                <option value="fresher" style={{ color: 'black' }}>Fresher (0-1 yrs)</option>
                <option value="1_2_years" style={{ color: 'black' }}>1-2 Years</option>
                <option value="3_5_years" style={{ color: 'black' }}>3-5 Years</option>
                <option value="5_plus_years" style={{ color: 'black' }}>5+ Years</option>
                <option value="unspecified" style={{ color: 'black' }}>Unspecified</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] text-slate-500">
                ▼
              </div>
            </div>
          </div>

          {/* Remote Checkbox & Search Button */}
          <div className="flex items-center justify-between space-x-6">
            <label className="flex items-center space-x-3 cursor-pointer select-none py-3">
              <input
                type="checkbox"
                checked={remote}
                onChange={(e) => setRemote(e.target.checked)}
                className="w-5 h-5 rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-950 cursor-pointer"
              />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Remote Only</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/15"
            >
              {loading ? (
                <>
                  <div className="spinner w-4 h-4 border-t-white" />
                  <span>Searching...</span>
                </>
              ) : (
                <span>Find Jobs</span>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm mb-6 flex items-start space-x-3 animate-fadeIn">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-bold">Search Failed</p>
            <p className="opacity-95">{error}</p>
          </div>
        </div>
      )}

      {/* Search Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-card p-6 flex flex-col space-y-4 skeleton min-h-[160px]">
              <div className="flex justify-between items-start opacity-20">
                <div className="space-y-2 w-2/3">
                  <div className="h-5 bg-slate-800 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                </div>
                <div className="h-6 bg-slate-800 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results Fallback */}
      {!loading && jobs.length === 0 && !error && (
        <div className="glass-card p-12 text-center empty-state animate-fadeIn">
          <div className="empty-state-icon flex justify-center items-center">
            <svg
              className="w-16 h-16 float-anim"
              viewBox="0 0 24 24"
              fill="none"
              stroke="url(#search-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 8px 24px rgba(99,102,241,0.3))' }}
            >
              <defs>
                <linearGradient id="search-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h3 className="empty-state-title">No Jobs Discovered</h3>
          <p className="empty-state-body">
            Try entering keywords (like React or Python) and clicking search to discover jobs.
          </p>
        </div>
      )}

      {/* Job listings */}
      {!loading && jobs.length > 0 && (() => {
        const filteredJobs = selectedExp === 'any'
          ? jobs
          : jobs.filter(j => j.experience_level === selectedExp);

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between pl-1 animate-fadeIn">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {filteredJobs.length} of {jobs.length} jobs shown
                {selectedExp !== 'any' && (
                  <button
                    onClick={() => setSelectedExp('any')}
                    className="ml-2 text-indigo-400 hover:text-indigo-300 underline text-xs font-semibold transition"
                  >
                    Clear filter
                  </button>
                )}
              </p>
            </div>
            {filteredJobs.map((job, idx) => {
              const isExpanded = expandedJobId === job.id;
              const matchAnalysis = matchAnalyses[job.id];
              const expBadge = getExperienceBadge(job.experience_level);
              const delayClass = idx < 10 ? `delay-${idx * 50}` : '';
              
              return (
                <div
                  key={job.id}
                  className={`glass-card overflow-hidden shadow-md border entrance-anim ${delayClass} ${
                    isExpanded ? 'border-indigo-500/80 bg-slate-900/40' : ''
                  }`}
                >
                  {/* Collapsed Job Header click zone */}
                  <div
                    onClick={() => toggleExpandJob(job.id)}
                    className="p-6 cursor-pointer flex justify-between items-start flex-wrap gap-4 hover:bg-slate-800/10 transition"
                  >
                    <div className="space-y-1.5 flex-1 min-w-[280px]">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <h3 className="font-bold text-lg group-hover:text-indigo-400 transition" style={{ color: 'var(--text-primary)' }}>
                          {job.title}
                        </h3>
                        {job.remote && (
                          <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
                            Remote
                          </span>
                        )}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${expBadge.style}`}>
                          💼 {expBadge.label}
                        </span>
                        {matchAnalysis?.data && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getMatchLevel(matchAnalysis.data.match_percent).bg}`}>
                            {matchAnalysis.data.match_percent}% Match
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-sm font-semibold" style={{ color: 'var(--text-link)' }}>
                        <span>{job.company}</span>
                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{job.location || 'Location Not Specified'}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-center">
                      {/* Source tag */}
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded border ${
                        job.source === 'adzuna'
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : job.source === 'jsearch'
                          ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                          : 'bg-slate-850 border-slate-700 text-slate-400'
                      }`}>
                        {job.source.toUpperCase()}
                      </span>

                      {/* Expand arrow */}
                      <span className={`text-slate-500 text-lg transition-transform duration-350 ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details Section */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-glass)' }}>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                        
                        {/* Job Description (Left 2 columns) */}
                        <div className="lg:col-span-2 space-y-6">
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Job Description</h4>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                              {job.description || 'No description provided.'}
                            </p>
                          </div>

                          {/* Semantic Match Analysis results widget */}
                          {matchAnalysis && (
                            <div className="border-t pt-6 mt-4" style={{ borderColor: 'var(--border-subtle)' }}>
                              <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-primary)' }}>Semantic Matching Analysis</h4>
                              
                              {/* Loading state */}
                              {matchAnalysis.loading && (
                                <div className="border rounded-xl p-6 flex flex-col items-center justify-center space-y-4" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                                  <div className="spinner w-8 h-8 border-t-indigo-500"></div>
                                  <p className="text-xs text-indigo-400 font-mono animate-pulse">Running vector similarity & LLM gap analysis...</p>
                                </div>
                              )}

                              {/* Error state */}
                              {matchAnalysis.error && (
                                <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 text-xs text-rose-300">
                                  <p className="font-semibold mb-1">Failed to compute match</p>
                                  <p>{matchAnalysis.error}</p>
                                </div>
                              )}

                              {/* Data successfully loaded */}
                              {matchAnalysis.data && (
                                <div className="border p-6 rounded-2xl shadow-inner space-y-6 animate-fadeIn" style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}>
                                  
                                  {/* Header Ring & Level */}
                                  <div className="flex items-center space-x-6 flex-wrap gap-4">
                                    {/* Radial circle for matching percent */}
                                    <div className="relative w-16 h-16 flex items-center justify-center">
                                      <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="32" cy="32" r="28" className="fill-none" stroke="var(--border-subtle)" strokeWidth="4" />
                                        <circle
                                          cx="32"
                                          cy="32"
                                          r="28"
                                          className={`fill-none ${getMatchScoreColor(matchAnalysis.data.match_percent).split(' ')[1]}`}
                                          strokeWidth="4"
                                          strokeDasharray="176"
                                          strokeDashoffset={176 - (176 * matchAnalysis.data.match_percent) / 100}
                                          strokeLinecap="round"
                                          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                                        />
                                      </svg>
                                      <span className="absolute text-xs font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                                        {Math.round(matchAnalysis.data.match_percent)}%
                                      </span>
                                    </div>
                                    
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Matching Quality</span>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getMatchLevel(matchAnalysis.data.match_percent).bg}`}>
                                          {getMatchLevel(matchAnalysis.data.match_percent).label}
                                        </span>
                                      </div>
                                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>Calculated via cosine similarity of resume and job description vectors.</p>
                                    </div>
                                  </div>

                                  {/* Strengths and Weaknesses Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                    {/* Strengths */}
                                    <div className="space-y-3">
                                      <h5 className="text-[10px] font-bold uppercase tracking-wider flex items-center" style={{ color: 'var(--text-muted)' }}>
                                        <span className="mr-2 text-emerald-400">✅</span> Strengths
                                      </h5>
                                      {matchAnalysis.data.strengths && matchAnalysis.data.strengths.length > 0 ? (
                                        <ul className="space-y-1.5">
                                          {matchAnalysis.data.strengths.map((str, idx) => (
                                            <li key={idx} className="text-xs leading-relaxed flex items-start" style={{ color: 'var(--text-secondary)' }}>
                                              <span className="text-indigo-400 mr-2">•</span>
                                              <span>{str}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No direct strengths identified.</p>
                                      )}
                                    </div>

                                    {/* Weaknesses */}
                                    <div className="space-y-3">
                                      <h5 className="text-[10px] font-bold uppercase tracking-wider flex items-center" style={{ color: 'var(--text-muted)' }}>
                                        <span className="mr-2 text-rose-400">⚠️</span> Areas to Address
                                      </h5>
                                      {matchAnalysis.data.weaknesses && matchAnalysis.data.weaknesses.length > 0 ? (
                                        <ul className="space-y-1.5">
                                          {matchAnalysis.data.weaknesses.map((weak, idx) => (
                                            <li key={idx} className="text-xs leading-relaxed flex items-start" style={{ color: 'var(--text-secondary)' }}>
                                              <span className="text-indigo-400 mr-2">•</span>
                                              <span>{weak}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No critical areas to address identified.</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Missing Skills Section */}
                                  <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                                    <h5 className="text-[10px] font-bold uppercase tracking-wider flex items-center" style={{ color: 'var(--text-muted)' }}>
                                      <span className="mr-2 text-amber-400">❌</span> Missing Skills / Keywords
                                    </h5>
                                    {matchAnalysis.data.missing_skills && matchAnalysis.data.missing_skills.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {matchAnalysis.data.missing_skills.map((skill, idx) => (
                                          <span
                                            key={idx}
                                            className="text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-300 font-semibold px-2 py-0.5 rounded"
                                          >
                                            {skill}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-emerald-400 italic">Perfect match! No missing skills identified.</p>
                                    )}
                                  </div>

                                </div>
                              )}

                            </div>
                          )}
                        </div>

                        {/* Job Meta Sidebar (Right 1 column) */}
                        <div className="space-y-4 border p-4 rounded-xl h-fit shadow-sm" style={{ background: 'var(--bg-glass)', borderColor: 'var(--border)' }}>
                          <div>
                            <h4 className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Salary Range</h4>
                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{job.salary_range || 'Not Specified'}</p>
                          </div>
                          <div>
                            <h4 className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Source</h4>
                            <p className="text-xs font-semibold capitalize" style={{ color: 'var(--text-secondary)' }}>{job.source}</p>
                          </div>
                          <div>
                            <h4 className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Fetched At</h4>
                            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                              {new Date(job.fetched_at).toLocaleString()}
                            </p>
                          </div>
                          
                          <div className="pt-4 space-y-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                            <a
                              href={job.apply_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full block text-center btn-primary text-xs py-2"
                            >
                              Apply Directly
                            </a>

                            {job.has_contact_email && (
                              <button
                                onClick={() => setActiveEmailJob(job)}
                                className="w-full text-center btn-secondary hover:text-emerald-300 font-semibold py-2 rounded-lg text-xs transition"
                              >
                                ✉️ Apply via Email
                              </button>
                            )}

                            <button
                              onClick={() => handleComputeMatch(job.id)}
                              disabled={matchAnalysis?.loading}
                              className="w-full text-center btn-secondary font-semibold py-2 rounded-lg text-xs transition"
                            >
                              🎯 Compute Match %
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {activeEmailJob && (
        <EmailApply
          job={activeEmailJob}
          onClose={() => setActiveEmailJob(null)}
          onSuccess={() => {
            // Success handler if we want to do anything on successfully sending email
          }}
        />
      )}
    </div>
  );
};

export default JobSearch;
