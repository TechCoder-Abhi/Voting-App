import { useEffect, useMemo, useState } from 'react';
import { votingApi } from './api';
import Reveal from './components/Reveal';

const STORAGE_KEY = 'voting-app-token';

const emptyAuthForm = {
  name: '',
  age: '',
  email: '',
  mobile: '',
  address: '',
  aadharCardNumber: '',
  password: '',
  role: 'voter',
};

const emptyCandidateForm = {
  name: '',
  party: '',
  age: '',
};

const emptyPasswordForm = {
  currentPassword: '',
  newPassword: '',
};

const initialSession = {
  token: localStorage.getItem(STORAGE_KEY) || '',
  user: null,
};

const dashboardCopy = {
  admin: {
    label: 'Admin Dashboard',
    title: 'Control panel',
    subtitle: 'Manage candidates and see vote totals.',
    actions: ['Create', 'Edit', 'Delete', 'Monitor'],
  },
  voter: {
    label: 'User Dashboard',
    title: 'Voting portal',
    subtitle: 'Review candidates and cast one vote.',
    actions: ['Browse', 'Vote', 'Profile', 'Password'],
  },
};

const authTabs = [
  { id: 'login', label: 'Login' },
  { id: 'signup', label: 'Sign up' },
];

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [candidateForm, setCandidateForm] = useState(emptyCandidateForm);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [editingCandidateId, setEditingCandidateId] = useState('');
  const [session, setSession] = useState(initialSession);
  const [candidates, setCandidates] = useState([]);
  const [voteCounts, setVoteCounts] = useState([]);
  const [status, setStatus] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState({ auth: false, dashboard: false, admin: false, password: false });
  const [pendingVoteId, setPendingVoteId] = useState('');
  const [showIntro, setShowIntro] = useState(true);

  const role = session.user?.role || '';
  const hasToken = Boolean(session.token);
  const isAdmin = role === 'admin';
  const isVoter = role === 'voter';
  const dashboard = dashboardCopy[role] || dashboardCopy.voter;

  const totalVotes = useMemo(
    () => voteCounts.reduce((sum, entry) => sum + Number(entry.count || 0), 0),
    [voteCounts],
  );

  const formattedTotalVotes = useMemo(
    () => new Intl.NumberFormat('en-US').format(totalVotes),
    [totalVotes],
  );

  const getCandidateId = (candidate) => candidate._id || candidate.id;

  const setFeedback = (type, text) => setStatus({ type, text });
  const clearFeedback = () => setStatus((current) => (current.text ? { type: '', text: '' } : current));

  const syncProfile = async (token) => {
    const response = await votingApi.getProfile(token);
    setSession((current) => ({ ...current, user: response.user }));
    return response.user;
  };

  const syncDashboard = async () => {
    setLoading((current) => ({ ...current, dashboard: true }));

    try {
      const [candidateList, voteSummary] = await Promise.all([votingApi.listCandidates(), votingApi.getVoteCounts()]);
      setCandidates(candidateList);
      setVoteCounts(voteSummary);
    } catch (error) {
      setFeedback('error', error.message);
    } finally {
      setLoading((current) => ({ ...current, dashboard: false }));
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      await syncDashboard();

      if (session.token) {
        try {
          await syncProfile(session.token);
        } catch (error) {
          localStorage.removeItem(STORAGE_KEY);
          setSession({ token: '', user: null });
          setFeedback('error', error.message);
        }
      }
    };

    bootstrap();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession({ token: '', user: null });
    setPasswordForm(emptyPasswordForm);
    setEditingCandidateId('');
    setCandidateForm(emptyCandidateForm);
    setFeedback('success', 'Logged out.');
    // show the public home/intro after logging out
    setShowIntro(true);
    setAuthMode('login');
    setTimeout(() => scrollToElement('#top'), 60);
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setLoading((current) => ({ ...current, auth: true }));
    clearFeedback();

    try {
      if (authMode === 'signup') {
        const response = await votingApi.signup({ ...authForm, age: Number(authForm.age) });
        localStorage.setItem(STORAGE_KEY, response.token);
        setSession({ token: response.token, user: response.user });
        setFeedback('success', 'Account created.');
      } else {
        const response = await votingApi.login({
          aadharCardNumber: authForm.aadharCardNumber,
          password: authForm.password,
        });

        localStorage.setItem(STORAGE_KEY, response.token);
        setSession({ token: response.token, user: null });
        await syncProfile(response.token);
        setFeedback('success', 'Signed in.');
      }

      setAuthForm(emptyAuthForm);
      await syncDashboard();
    } catch (error) {
      setFeedback('error', error.message);
    } finally {
      setLoading((current) => ({ ...current, auth: false }));
    }
  };

  const handleVote = async (candidateId) => {
    if (!session.token) {
      setFeedback('error', 'Sign in first.');
      return;
    }

    if (!isVoter) {
      setFeedback('error', 'Only voter accounts can vote.');
      return;
    }

    if (session.user?.isVoted) {
      setFeedback('error', 'Vote already used.');
      return;
    }

    setPendingVoteId(candidateId);
    clearFeedback();

    try {
      await votingApi.voteForCandidate(session.token, candidateId);
      setFeedback('success', 'Vote recorded.');
      await Promise.all([syncDashboard(), syncProfile(session.token)]);
    } catch (error) {
      setFeedback('error', error.message);
    } finally {
      setPendingVoteId('');
    }
  };

  const beginEditCandidate = (candidate) => {
    setEditingCandidateId(getCandidateId(candidate));
    setCandidateForm({
      name: candidate.name,
      party: candidate.party,
      age: String(candidate.age),
    });
    setFeedback('success', `Editing ${candidate.name}.`);
  };

  const clearCandidateForm = () => {
    setEditingCandidateId('');
    setCandidateForm(emptyCandidateForm);
  };

  const scrollToElement = (selector) => {
    const element = document.querySelector(selector);

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCandidateSubmit = async (event) => {
    event.preventDefault();

    if (!session.token || !isAdmin) {
      setFeedback('error', 'Admin access required.');
      return;
    }

    setLoading((current) => ({ ...current, admin: true }));
    clearFeedback();

    try {
      const payload = {
        name: candidateForm.name.trim(),
        party: candidateForm.party.trim(),
        age: Number(candidateForm.age),
      };

      if (editingCandidateId) {
        await votingApi.updateCandidate(session.token, editingCandidateId, payload);
        setFeedback('success', 'Candidate updated.');
      } else {
        await votingApi.createCandidate(session.token, payload);
        setFeedback('success', 'Candidate created.');
      }

      clearCandidateForm();
      await syncDashboard();
    } catch (error) {
      setFeedback('error', error.message);
    } finally {
      setLoading((current) => ({ ...current, admin: false }));
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!session.token || !isAdmin) {
      setFeedback('error', 'Admin access required.');
      return;
    }

    const shouldDelete = window.confirm('Delete this candidate?');
    if (!shouldDelete) {
      return;
    }

    setLoading((current) => ({ ...current, admin: true }));

    try {
      await votingApi.deleteCandidate(session.token, candidateId);
      if (editingCandidateId === candidateId) {
        clearCandidateForm();
      }
      setFeedback('success', 'Candidate removed.');
      await syncDashboard();
    } catch (error) {
      setFeedback('error', error.message);
    } finally {
      setLoading((current) => ({ ...current, admin: false }));
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (!session.token) {
      setFeedback('error', 'Sign in first.');
      return;
    }

    setLoading((current) => ({ ...current, password: true }));

    try {
      await votingApi.changePassword(session.token, passwordForm);
      setPasswordForm(emptyPasswordForm);
      setFeedback('success', 'Password updated.');
    } catch (error) {
      setFeedback('error', error.message);
    } finally {
      setLoading((current) => ({ ...current, password: false }));
    }
  };

  return (
    <div className="shell app-shell" id="top">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      {status.text ? <section className={`notice ${status.type}`}>{status.text}</section> : null}

      <Reveal>
        <section className="hero-banner panel">
          <div className="hero-banner-copy">
            <p className="eyebrow">Voting App</p>
            <h1>{hasToken ? dashboard.title : 'Vote with confidence'}</h1>
            <p>{hasToken ? dashboard.subtitle : 'Sign in to continue to a role-based dashboard.'}</p>
          </div>

          <div className="hero-banner-actions">
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setShowIntro(true);
                setAuthMode('login');
                setTimeout(() => scrollToElement('#top'), 60);
              }}
            >
              Home
            </button>
            {!hasToken ? (
              <>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setShowIntro(false);
                    setTimeout(() => scrollToElement('#auth-section'), 60);
                  }}
                >
                  Get started
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setShowIntro(false);
                    setTimeout(() => scrollToElement('#auth-section'), 60);
                  }}
                >
                  Login
                </button>
              </>
            ) : (
              <>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => scrollToElement(hasToken && isAdmin ? '#admin-dashboard' : '#user-dashboard')}
                >
                  Open dashboard
                </button>
                <button className="ghost-button" type="button" onClick={handleLogout}>
                  Logout
                </button>
              </>
            )}
          </div>
        </section>
      </Reveal>

      {!hasToken && showIntro ? (
        <main className="home-grid">
          <section className="panel home-main">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Latest</p>
                <h2>Announcements & live updates</h2>
              </div>
            </div>

            <div className="home-messages">
              <article className="notice" style={{ marginBottom: '0.75rem' }}>
                Voting opens at 09:00. Results update in real time.
              </article>
              <article className="notice">
                Tip: create a voter account to cast your vote and view personalized status.
              </article>
            </div>

            <div className="panel-header" style={{ marginTop: '1rem' }}>
              <div>
                <p className="eyebrow">Leaderboard</p>
                <h2>Live leaderboard</h2>
              </div>
            </div>

            <div className="leaderboard-list">
              {voteCounts.length > 0 ? (
                voteCounts.map((entry) => (
                  <div key={entry.party} className="leaderboard-row">
                    <span>{entry.party}</span>
                    <strong>{entry.count}</strong>
                  </div>
                ))
              ) : (
                <p className="muted">No votes yet — leaderboard will appear here.</p>
              )}
            </div>

            <div className="panel-header" style={{ marginTop: '1rem' }}>
              <div>
                <p className="eyebrow">Candidates</p>
                <h2>Who you can vote for</h2>
              </div>
            </div>

            <div className="candidate-list">
              {candidates.length > 0 ? (
                candidates.map((c) => (
                  <article className="candidate-card" key={getCandidateId(c)}>
                    <div>
                      <p className="candidate-name">{c.name}</p>
                      <p className="candidate-party">{c.party}</p>
                    </div>
                    <div className="candidate-meta">
                      <span>Age {c.age}</span>
                      <span>{c.voteCount ?? 0} votes</span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="muted">No candidates available yet.</p>
              )}
            </div>
          </section>

          <aside className="panel home-side">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Stats</p>
                <h2>Total votes</h2>
              </div>
            </div>

            <div className="kpi-large panel" style={{ marginTop: '0.6rem', padding: '1.25rem' }}>
              <div className="kpi-copy">
                <span className="muted">All-time</span>
                <strong style={{ fontSize: '2rem' }}>{formattedTotalVotes}</strong>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <p className="eyebrow">Quick links</p>
              <div className="feature-chips" style={{ marginTop: '0.6rem' }}>
                <button className="primary-button" type="button" onClick={() => { setShowIntro(false); setAuthMode('signup'); setTimeout(() => scrollToElement('#auth-section'), 60); }}>
                  Create account
                </button>
                <button className="ghost-button" type="button" onClick={() => { setShowIntro(false); setAuthMode('login'); setTimeout(() => scrollToElement('#auth-section'), 60); }}>
                  Sign in
                </button>
              </div>
            </div>
          </aside>
        </main>
      ) : null}

      {!hasToken && !showIntro ? (
        <Reveal>
          <main className="public-single" id="auth-section">
            {/* public hero-card removed to keep focus on auth */}

          <section className="panel auth-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Access</p>
                <h2>{authMode === 'login' ? 'Login' : 'Sign up'}</h2>
              </div>

              <div className="segmented-control">
                {authTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={authMode === tab.id ? 'active' : ''}
                    onClick={() => setAuthMode(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <form className="form-grid auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'signup' ? (
                <>
                  <label>
                    Name
                    <input
                      value={authForm.name}
                      onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                      placeholder="Full name"
                    />
                  </label>
                  <label>
                    Age
                    <input
                      value={authForm.age}
                      onChange={(event) => setAuthForm({ ...authForm, age: event.target.value })}
                      placeholder="18+"
                      type="number"
                      min="18"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      value={authForm.email}
                      onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                      placeholder="name@example.com"
                    />
                  </label>
                  <label>
                    Mobile
                    <input
                      value={authForm.mobile}
                      onChange={(event) => setAuthForm({ ...authForm, mobile: event.target.value })}
                      placeholder="Optional"
                    />
                  </label>
                  <label className="full-span">
                    Address
                    <input
                      value={authForm.address}
                      onChange={(event) => setAuthForm({ ...authForm, address: event.target.value })}
                      placeholder="Address"
                    />
                  </label>
                  <label>
                    Aadhar Card Number
                    <input
                      value={authForm.aadharCardNumber}
                      onChange={(event) => setAuthForm({ ...authForm, aadharCardNumber: event.target.value })}
                      placeholder="12 digits"
                      maxLength="12"
                    />
                  </label>
                  <label>
                    Password
                    <input
                      value={authForm.password}
                      onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                      placeholder="Password"
                      type="password"
                    />
                  </label>
                  <label className="full-span">
                    Role
                    <select value={authForm.role} onChange={(event) => setAuthForm({ ...authForm, role: event.target.value })}>
                      <option value="voter">Voter</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label className="full-span">
                    Aadhar Card Number
                    <input
                      value={authForm.aadharCardNumber}
                      onChange={(event) => setAuthForm({ ...authForm, aadharCardNumber: event.target.value })}
                      placeholder="12 digits"
                      maxLength="12"
                    />
                  </label>
                  <label className="full-span">
                    Password
                    <input
                      value={authForm.password}
                      onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                      placeholder="Password"
                      type="password"
                    />
                  </label>
                </>
              )}

              <button className="primary-button full-span" type="submit" disabled={loading.auth}>
                {loading.auth ? 'Working...' : authMode === 'login' ? 'Login' : 'Create account'}
              </button>
            </form>
          </section>
          </main>
        </Reveal>
      ) : null}

      {hasToken && isAdmin ? (
        <Reveal>
          <main className="dashboard-layout" id="admin-dashboard">
          <aside className="dashboard-rail panel">
            <div className="section-stack">
              <div>
                <p className="eyebrow">Admin dashboard</p>
                <h2>{dashboard.title}</h2>
                <p className="section-copy">{dashboard.subtitle}</p>
              </div>

              <div className="mini-stats">
                <div>
                  <span>Role</span>
                  <strong>{session.user?.role || 'admin'}</strong>
                </div>
                <div className="stat-highlight">
                  <span>Votes cast</span>
                  <strong>{formattedTotalVotes}</strong>
                  <small>Across all candidates</small>
                </div>
              </div>

              <div className="feature-chips">
                {dashboard.actions.map((item) => (
                  <span key={item} className="feature-chip">
                    {item}
                  </span>
                ))}
              </div>

              <form className="mini-form account-card" onSubmit={handlePasswordSubmit}>
                <h3>Security</h3>
                <input
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                  placeholder="Current password"
                  type="password"
                />
                <input
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                  placeholder="New password"
                  type="password"
                />
                <button className="secondary-button" type="submit" disabled={loading.password}>
                  {loading.password ? 'Saving...' : 'Update password'}
                </button>
              </form>
            </div>
          </aside>

          <section className="dashboard-main">
            <article className="panel content-card" id="support-section">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Candidate manager</p>
                  <h2>{editingCandidateId ? 'Edit candidate' : 'Add candidate'}</h2>
                </div>
                {editingCandidateId ? (
                  <button className="ghost-button" type="button" onClick={clearCandidateForm}>
                    Cancel
                  </button>
                ) : null}
              </div>

              <form className="form-grid candidate-form" onSubmit={handleCandidateSubmit}>
                <label className="full-span">
                  Name
                  <input
                    value={candidateForm.name}
                    onChange={(event) => setCandidateForm({ ...candidateForm, name: event.target.value })}
                    placeholder="Candidate name"
                  />
                </label>
                <label>
                  Party
                  <input
                    value={candidateForm.party}
                    onChange={(event) => setCandidateForm({ ...candidateForm, party: event.target.value })}
                    placeholder="Party"
                  />
                </label>
                <label>
                  Age
                  <input
                    value={candidateForm.age}
                    onChange={(event) => setCandidateForm({ ...candidateForm, age: event.target.value })}
                    placeholder="18+"
                    type="number"
                    min="18"
                  />
                </label>
                <button className="primary-button full-span" type="submit" disabled={loading.admin}>
                  {loading.admin ? 'Saving...' : editingCandidateId ? 'Update candidate' : 'Create candidate'}
                </button>
              </form>
            </article>

            <div className="dashboard-split">
              <article className="panel content-card" id="candidates-section">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Candidates</p>
                    <h2>Current list</h2>
                  </div>
                  <button className="ghost-button" type="button" onClick={syncDashboard} disabled={loading.dashboard}>
                    {loading.dashboard ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                <div className="candidate-list">
                  {candidates.length > 0 ? (
                    candidates.map((candidate) => {
                      const candidateId = getCandidateId(candidate);

                      return (
                        <article className="candidate-card" key={candidateId}>
                          <div>
                            <p className="candidate-name">{candidate.name}</p>
                            <p className="candidate-party">{candidate.party}</p>
                          </div>

                          <div className="candidate-meta">
                            <span>Age {candidate.age}</span>
                            <span>{candidate.voteCount ?? 0} votes</span>
                          </div>

                          <div className="candidate-actions">
                            <button type="button" className="secondary-button" onClick={() => beginEditCandidate(candidate)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger-button"
                              onClick={() => handleDeleteCandidate(candidateId)}
                              disabled={loading.admin}
                            >
                              Remove
                            </button>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <p className="muted">No candidates yet.</p>
                  )}
                </div>
              </article>

              <article className="panel content-card">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Leaderboard</p>
                    <h2>Vote totals</h2>
                  </div>
                </div>

                <div className="leaderboard-list">
                  {voteCounts.length > 0 ? (
                    voteCounts.map((entry) => (
                      <div key={entry.party} className="leaderboard-row">
                        <span>{entry.party}</span>
                        <strong>{entry.count}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="muted">No votes yet.</p>
                  )}
                </div>
              </article>
            </div>
          </section>
          </main>
        </Reveal>
      ) : null}

      {hasToken && isVoter ? (
        <Reveal>
          <main className="dashboard-layout" id="user-dashboard">
          <aside className="dashboard-rail panel">
            <div className="section-stack">
              <div>
                <p className="eyebrow">User dashboard</p>
                <h2>{dashboard.title}</h2>
                <p className="section-copy">{dashboard.subtitle}</p>
              </div>

              <div className="mini-stats">
                <div>
                  <span>Role</span>
                  <strong>{session.user?.role || 'voter'}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{session.user?.isVoted ? 'Voted' : 'Ready'}</strong>
                </div>
              </div>

              <div className="feature-chips">
                {dashboard.actions.map((item) => (
                  <span key={item} className="feature-chip">
                    {item}
                  </span>
                ))}
              </div>

              <form className="mini-form account-card" onSubmit={handlePasswordSubmit}>
                <h3>Password</h3>
                <input
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                  placeholder="Current password"
                  type="password"
                />
                <input
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                  placeholder="New password"
                  type="password"
                />
                <button className="secondary-button" type="submit" disabled={loading.password}>
                  {loading.password ? 'Saving...' : 'Update password'}
                </button>
              </form>
            </div>
          </aside>

          <section className="dashboard-main">
            <article className="panel content-card" id="support-section">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Voting booth</p>
                  <h2>Choose a candidate</h2>
                </div>
                <button className="ghost-button" type="button" onClick={syncDashboard} disabled={loading.dashboard}>
                  {loading.dashboard ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              <div className="candidate-list">
                {candidates.length > 0 ? (
                  candidates.map((candidate) => {
                    const candidateId = getCandidateId(candidate);

                    return (
                      <article className="candidate-card" key={candidateId}>
                        <div>
                          <p className="candidate-name">{candidate.name}</p>
                          <p className="candidate-party">{candidate.party}</p>
                        </div>

                        <div className="candidate-meta">
                          <span>Age {candidate.age}</span>
                          <span>{candidate.voteCount ?? 0} votes</span>
                        </div>

                        <div className="candidate-actions">
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => handleVote(candidateId)}
                            disabled={Boolean(pendingVoteId) || session.user?.isVoted}
                          >
                            {pendingVoteId === candidateId ? 'Voting...' : session.user?.isVoted ? 'Vote used' : 'Vote'}
                          </button>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="muted">No candidates yet.</p>
                )}
              </div>
            </article>

            <div className="dashboard-split">
              <article className="panel content-card" id="profile-section">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Profile</p>
                    <h2>Account</h2>
                  </div>
                </div>

                <div className="profile-grid">
                  <div>
                    <span>Name</span>
                    <strong>{session.user?.name || 'Loading...'}</strong>
                  </div>
                  <div>
                    <span>Role</span>
                    <strong>{session.user?.role || 'voter'}</strong>
                  </div>
                  <div>
                    <span>Voted</span>
                    <strong>{session.user?.isVoted ? 'Yes' : 'No'}</strong>
                  </div>
                  <div>
                    <span>Address</span>
                    <strong>{session.user?.address || 'Not provided'}</strong>
                  </div>
                </div>
              </article>

              <article className="panel content-card">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Leaderboard</p>
                    <h2>Vote totals</h2>
                  </div>
                </div>

                <div className="leaderboard-list">
                  {voteCounts.length > 0 ? (
                    voteCounts.map((entry) => (
                      <div key={entry.party} className="leaderboard-row">
                        <span>{entry.party}</span>
                        <strong>{entry.count}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="muted">No votes yet.</p>
                  )}
                </div>
              </article>
            </div>
          </section>
          </main>
        </Reveal>
      ) : null}

    </div>
  );
}

export default App;
