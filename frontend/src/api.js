const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3000'
  : 'https://voting-platfrom.onrender.com';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

async function apiRequest(path, { method = 'GET', token, body } = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || payload.message || 'Request failed');
    }

    return payload;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Unable to reach the backend server');
    }

    throw error;
  }
}

export const votingApi = {
  signup: (body) => apiRequest('/user/signup', { method: 'POST', body }),
  login: (body) => apiRequest('/user/login', { method: 'POST', body }),
  getProfile: (token) => apiRequest('/user/profile', { token }),
  changePassword: (token, body) => apiRequest('/user/profile/password', { method: 'PUT', token, body }),
  listCandidates: () => apiRequest('/candidate'),
  getVoteCounts: () => apiRequest('/candidate/vote/count'),
  createCandidate: (token, body) => apiRequest('/candidate', { method: 'POST', token, body }),
  updateCandidate: (token, candidateId, body) => apiRequest(`/candidate/${candidateId}`, { method: 'PUT', token, body }),
  deleteCandidate: (token, candidateId) => apiRequest(`/candidate/${candidateId}`, { method: 'DELETE', token }),
  voteForCandidate: (token, candidateId) => apiRequest(`/candidate/vote/${candidateId}`, { method: 'POST', token }),
};