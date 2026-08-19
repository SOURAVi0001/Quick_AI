import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_BASE_URL || '',
});

api.interceptors.response.use(
  async (response) => {
    // If the response is a queued background task
    if (
      response.data &&
      response.data.success &&
      response.data.taskId &&
      response.data.status === 'queued'
    ) {
      const { taskId } = response.data;

      const getAuthHeader = async () => {
        console.log('[DEBUG API] response.config.headers:', response.config.headers);
        if (window.Clerk && window.Clerk.session) {
          try {
            const token = await window.Clerk.session.getToken();
            console.log('[DEBUG Clerk Token]:', token ? 'Found' : 'Not Found');
            if (token) return `Bearer ${token}`;
          } catch (e) {
            console.error('[DEBUG Clerk Token Error]:', e);
          }
        } else {
          console.log('[DEBUG Clerk] window.Clerk or window.Clerk.session not initialized yet', {
            hasClerk: !!window.Clerk,
            hasSession: !!window.Clerk?.session,
          });
        }
        let headerValue = null;
        if (response.config.headers) {
          const headers = response.config.headers;
          if (typeof headers.get === 'function') {
            headerValue = headers.get('Authorization') || headers.get('authorization');
          }
          if (!headerValue) {
            headerValue =
              headers['Authorization'] ||
              headers['authorization'] ||
              headers['Authorization'] ||
              headers['AUTHORIZATION'];
          }
          if (!headerValue && typeof headers === 'object') {
            for (const key of Object.keys(headers)) {
              if (key.toLowerCase() === 'authorization') {
                headerValue = headers[key];
                break;
              }
            }
          }
        }
        console.log('[DEBUG Fallback Header]:', headerValue ? 'Found' : 'Not Found');
        return headerValue;
      };

      const originalAuth = await getAuthHeader();
      console.log('[DEBUG Polling Request Auth Header]:', originalAuth);

      const pollTask = () =>
        new Promise((resolve, reject) => {
          const startTime = Date.now();
          const timeout = 120000; // 2 minutes timeout
          const intervalTime = 1500;

          const interval = setInterval(async () => {
            if (Date.now() - startTime > timeout) {
              clearInterval(interval);
              reject(new Error('Task processing timed out. Please try again.'));
              return;
            }

            try {
              const res = await axios.get(`${api.defaults.baseURL}/api/ai/task/${taskId}`, {
                headers: originalAuth ? { Authorization: originalAuth } : {},
              });

              if (res.data && res.data.success) {
                const { state, result, failedReason } = res.data.task;
                if (state === 'completed') {
                  clearInterval(interval);
                  resolve(result);
                } else if (state === 'failed') {
                  clearInterval(interval);
                  reject(new Error(failedReason || 'Task processing failed.'));
                }
              }
            } catch (err) {
              // Ignore network glitches during polling and continue
            }
          }, intervalTime);
        });

      try {
        const taskResult = await pollTask();
        // Emulate synchronous success response structure
        response.data = {
          success: true,
          content: taskResult.content,
          demo: !!taskResult.demo,
          ...(response.data.sessionId && { sessionId: response.data.sessionId }),
          ...(taskResult.firstQuestion && { firstQuestion: taskResult.firstQuestion }),
          ...(taskResult.content?.evaluation && { evaluation: taskResult.content.evaluation }),
          ...(taskResult.content?.nextQuestion && {
            nextQuestion: taskResult.content.nextQuestion,
          }),
          ...(taskResult.content?.isConcluded !== undefined && {
            isConcluded: taskResult.content.isConcluded,
          }),
          ...(taskResult.content?.overallFeedback && {
            overallFeedback: taskResult.content.overallFeedback,
          }),
        };
        return response;
      } catch (err) {
        response.data = {
          success: false,
          message: err.message || 'Task processing failed.',
        };
        return response;
      }
    }
    return response;
  },
  (error) => Promise.reject(error),
);

export default api;
