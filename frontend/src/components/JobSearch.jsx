import React, { useState } from 'react';

const JobSearch = () => {
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [expandedJobId, setExpandedJobId] = useState(null);

  // Store matching analysis state per job: { [jobId]: { loading, data, error } }
  const [matchAnalyses, setMatchAnalyses] = useState({});

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
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Job Discovery & Match
        </h2>
        <p className="text-slate-400">
          Find matching jobs across Adzuna and JSearch, then compute a semantic gap analysis using local vector representations and Mistral AI.
        </p>
      </div>

      {/* Search Controls Card */}
      <form onSubmit={handleSearch} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 mb-8 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {/* Keywords input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Keywords</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-500">🔍</span>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. Python Developer, React..."
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition"
                required
              />
            </div>
          </div>

          {/* Location input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Location</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-500">📍</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bangalore, Remote, India..."
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          {/* Remote Checkbox & Search Button */}
          <div className="flex items-center justify-between space-x-6">
            <label className="flex items-center space-x-3 cursor-pointer select-none py-3">
              <input
                type="checkbox"
                checked={remote}
                onChange={(e) => setRemote(e.target.checked)}
                className="w-5 h-5 rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950 bg-slate-950 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-300">Remote Only</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-2.5 px-6 rounded-xl shadow-lg shadow-indigo-500/10 transition duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span>Find Jobs</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm mb-6 flex items-start space-x-3">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-semibold">Search Failed</p>
            <p className="opacity-95">{error}</p>
          </div>
        </div>
      )}

      {/* Search Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-slate-900/20 border border-slate-800/60 rounded-2xl p-6 animate-pulse flex flex-col space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2 w-2/3">
                  <div className="h-5 bg-slate-800 rounded w-1/2"></div>
                  <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                </div>
                <div className="h-6 bg-slate-800 rounded w-20"></div>
              </div>
              <div className="h-4 bg-slate-800 rounded w-full"></div>
              <div className="flex space-x-4 pt-2">
                <div className="h-8 bg-slate-800 rounded w-24"></div>
                <div className="h-8 bg-slate-800 rounded w-32"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results Fallback */}
      {!loading && jobs.length === 0 && !error && (
        <div className="bg-slate-900/20 border border-slate-850 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-bold text-white mb-1">No Jobs Discovered</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Try entering keywords (like React or Python) and clicking search to discover jobs.
          </p>
        </div>
      )}

      {/* Job listings */}
      {!loading && jobs.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400 pl-1">{jobs.length} jobs discovered</p>
          {jobs.map((job) => {
            const isExpanded = expandedJobId === job.id;
            const matchAnalysis = matchAnalyses[job.id];
            
            return (
              <div
                key={job.id}
                className={`bg-slate-900/40 border transition-all duration-300 rounded-2xl overflow-hidden ${
                  isExpanded ? 'border-indigo-500 bg-slate-900/60' : 'border-slate-800/80 hover:border-slate-700/80'
                }`}
              >
                {/* Collapsed Job Header click zone */}
                <div
                  onClick={() => toggleExpandJob(job.id)}
                  className="p-6 cursor-pointer flex justify-between items-start flex-wrap gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-[280px]">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-white text-lg group-hover:text-indigo-400 transition">
                        {job.title}
                      </h3>
                      {job.remote && (
                        <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full">
                          Remote
                        </span>
                      )}
                      {matchAnalysis?.data && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getMatchLevel(matchAnalysis.data.match_percent).bg}`}>
                          {matchAnalysis.data.match_percent}% Match
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-indigo-400 font-medium">
                      <span>{job.company}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-400">{job.location || 'Location Not Specified'}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-center">
                    {/* Source tag */}
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${
                      job.source === 'adzuna'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : job.source === 'jsearch'
                        ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                        : 'bg-slate-850 border-slate-700 text-slate-400'
                    }`}>
                      {job.source.toUpperCase()}
                    </span>

                    {/* Expand arrow */}
                    <span className={`text-slate-500 text-lg transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-800/80 bg-slate-950/20 animate-slide-down">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Job Description (Left 2 columns) */}
                      <div className="lg:col-span-2 space-y-6">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Job Description</h4>
                          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {job.description || 'No description provided.'}
                          </p>
                        </div>

                        {/* Semantic Match Analysis results widget */}
                        {matchAnalysis && (
                          <div className="border-t border-slate-800 pt-6 mt-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Semantic Matching Analysis</h4>
                            
                            {/* Loading state */}
                            {matchAnalysis.loading && (
                              <div className="bg-slate-950/30 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
                                <div className="w-8 h-8 rounded-full border-2 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
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
                              <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl shadow-inner space-y-6 animate-fade-in">
                                
                                {/* Header Ring & Level */}
                                <div className="flex items-center space-x-6 flex-wrap gap-4">
                                  {/* Radial circle for matching percent */}
                                  <div className="relative w-16 h-16 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                      <circle cx="32" cy="32" r="28" className="stroke-slate-800 fill-none" strokeWidth="4" />
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
                                    <span className="absolute text-xs font-bold text-white font-mono">
                                      {Math.round(matchAnalysis.data.match_percent)}%
                                    </span>
                                  </div>
                                  
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-semibold text-slate-200">Matching Quality</span>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getMatchLevel(matchAnalysis.data.match_percent).bg}`}>
                                        {getMatchLevel(matchAnalysis.data.match_percent).label}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Calculated via cosine similarity of resume and job description vectors.</p>
                                  </div>
                                </div>

                                {/* Strengths and Weaknesses Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                  {/* Strengths */}
                                  <div className="space-y-3">
                                    <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                      <span className="mr-2 text-emerald-400">✅</span> Strengths
                                    </h5>
                                    {matchAnalysis.data.strengths && matchAnalysis.data.strengths.length > 0 ? (
                                      <ul className="space-y-1.5">
                                        {matchAnalysis.data.strengths.map((str, idx) => (
                                          <li key={idx} className="text-xs text-slate-300 leading-relaxed flex items-start">
                                            <span className="text-indigo-400 mr-2">•</span>
                                            <span>{str}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-xs text-slate-500 italic">No direct strengths identified.</p>
                                    )}
                                  </div>

                                  {/* Weaknesses */}
                                  <div className="space-y-3">
                                    <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                      <span className="mr-2 text-rose-400">⚠️</span> Areas to Address
                                    </h5>
                                    {matchAnalysis.data.weaknesses && matchAnalysis.data.weaknesses.length > 0 ? (
                                      <ul className="space-y-1.5">
                                        {matchAnalysis.data.weaknesses.map((weak, idx) => (
                                          <li key={idx} className="text-xs text-slate-300 leading-relaxed flex items-start">
                                            <span className="text-indigo-400 mr-2">•</span>
                                            <span>{weak}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-xs text-slate-500 italic">No critical areas to address identified.</p>
                                    )}
                                  </div>
                                </div>

                                {/* Missing Skills Section */}
                                <div className="space-y-3 pt-2 border-t border-slate-900">
                                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
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
                      <div className="space-y-4 bg-slate-950/40 p-4 border border-slate-800 rounded-xl h-fit">
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Salary Range</h4>
                          <p className="text-sm font-semibold text-slate-200">{job.salary_range || 'Not Specified'}</p>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Source</h4>
                          <p className="text-xs text-slate-300 font-medium capitalize">{job.source}</p>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fetched At</h4>
                          <p className="text-xs text-slate-400">
                            {new Date(job.fetched_at).toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="pt-4 space-y-2 border-t border-slate-900">
                          <a
                            href={job.apply_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full block text-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg text-xs shadow transition"
                          >
                            Apply Directly
                          </a>

                          <button
                            onClick={() => handleComputeMatch(job.id)}
                            disabled={matchAnalysis?.loading}
                            className="w-full text-center bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-400 font-semibold py-2 px-4 rounded-lg text-xs transition disabled:opacity-50"
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
      )}
    </div>
  );
};

export default JobSearch;
