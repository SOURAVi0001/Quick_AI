import api from '../api';

// Utility to recursively convert snake_case keys to camelCase
function toCamel(obj) {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamel(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/([-_][a-z])/g, group =>
        group.toUpperCase().replace('-', '').replace('_', '')
      );
      result[camelKey] = toCamel(obj[key]);
      return result;
    }, {});
  }
  return obj;
}

// Utility to recursively convert camelCase keys to snake_case
function toSnake(obj) {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnake(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnake(obj[key]);
      return result;
    }, {});
  }
  return obj;
}

export async function fetchApplications(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch applications and activities in parallel
  const [resApp, resAct] = await Promise.all([
    api.get('/api/job-applications', { headers }),
    api.get('/api/job-applications/activities', { headers })
  ]);

  if (!resApp.data.success) return [];

  const rawApps = resApp.data.items || resApp.data.content || [];
  const rawActivities = resAct.data.success ? (resAct.data.content || []) : [];

  const applications = toCamel(rawApps);
  const activities = toCamel(rawActivities);

  // Synthesize each application's timeline from the global activities
  return applications.map(app => {
    const appActivities = activities
      .filter(act => String(act.applicationId) === String(app.id))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const timeline = appActivities.map(act => ({
      id: act.id,
      label: act.newStatus || act.type,
      at: act.createdAt
    }));

    return {
      ...app,
      timeline
    };
  });
}

export async function fetchActivity(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await api.get('/api/job-applications/activities', { headers });

  if (!res.data.success) return [];

  const activities = toCamel(res.data.content || []);
  return activities.map(act => ({
    id: act.id,
    company: act.company || 'Job Application',
    message: act.note || `Status updated to ${act.newStatus}`,
    at: act.createdAt
  }));
}

export async function createApplication(payload, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await api.post('/api/job-applications', toSnake(payload), { headers });
  
  if (!res.data.success) throw new Error(res.data.message || 'Failed to create application');
  return toCamel(res.data.content);
}

export async function updateApplicationStatus(id, status, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await api.patch(`/api/job-applications/${id}`, { status }, { headers });

  if (!res.data.success) throw new Error(res.data.message || 'Failed to update application');
  return { id, status };
}

export async function generateInsights(applications, profile, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await api.post('/api/job-applications/insights/analyze', { profile }, { headers });

  if (!res.data.success) throw new Error(res.data.message || 'Failed to generate insights');
  
  // The Axios transparent polling interceptor will resolve taskResult.content directly
  return toCamel(res.data.content);
}

export async function fetchInsightHistory(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await api.get('/api/job-applications/insights/history', { headers });

  if (!res.data.success) return [];
  const rawHistory = res.data.items || res.data.content || [];
  
  // Convert list of insight records to UI snapshots format
  return toCamel(rawHistory).map(item => {
    // If the database stored the full JSON response in analysisJson, use it
    if (item.analysisJson) {
      return item.analysisJson;
    }
    return {
      summary: item.summary,
      generatedAt: item.createdAt,
      applicationsAnalyzed: item.dataQuality?.applicationCount || 0
    };
  });
}
