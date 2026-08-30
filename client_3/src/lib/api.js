import axios from 'axios';
import { waitForTaskSocket, removeTaskSocketListener } from './socket';

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
        if (window.Clerk && window.Clerk.session) {
          try {
            const token = await window.Clerk.session.getToken();
            if (token) return `Bearer ${token}`;
          } catch (e) {
            console.error('[Clerk Token Error]:', e);
          }
        }
        let headerValue = null;
        if (response.config.headers) {
          const headers = response.config.headers;
          if (typeof headers.get === 'function') {
            headerValue = headers.get('Authorization') || headers.get('authorization');
          }
          if (!headerValue) {
            headerValue =
              headers['Authorization'] || headers['authorization'] || headers['AUTHORIZATION'];
          }
        }
        return headerValue;
      };

      const pollTask = () =>
        new Promise((resolve, reject) => {
          const startTime = Date.now();
          const timeout = 180000; // 3 minutes
          const intervalTime = 1200;
          let notFoundStreak = 0;

          const interval = setInterval(async () => {
            if (Date.now() - startTime > timeout) {
              clearInterval(interval);
              reject(new Error('Task processing timed out. Please try again.'));
              return;
            }

            try {
              const freshAuth = await getAuthHeader();
              const url = `${api.defaults.baseURL}/api/ai/task/${taskId}`;
              const res = await axios.get(url, {
                headers: freshAuth ? { Authorization: freshAuth } : {},
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
              } else if (res.data && res.data.success === false) {
                notFoundStreak += 1;
                if (notFoundStreak >= 6) {
                  clearInterval(interval);
                  reject(new Error(res.data.message || 'Task not found.'));
                }
              }
            } catch (err) {
              // Ignore transient network errors during poll
              console.warn('[Polling] task status check:', err?.message);
            }
          }, intervalTime);

          // Store cleanup function on the promise if needed
          pollTask.stop = () => clearInterval(interval);
        });

      try {
        // Race Socket.IO real-time event and HTTP Polling for instant response
        const taskResult = await Promise.race([waitForTaskSocket(taskId), pollTask()]);

        if (pollTask.stop) pollTask.stop();
        removeTaskSocketListener(taskId);

        // Normalize task result
        const content = taskResult?.content !== undefined ? taskResult.content : taskResult;
        const demo = !!taskResult?.demo;

        response.data = {
          success: true,
          content,
          demo,
          ...(response.data.sessionId && { sessionId: response.data.sessionId }),
          ...(taskResult?.firstQuestion && { firstQuestion: taskResult.firstQuestion }),
          ...(taskResult?.allQuestions && { allQuestions: taskResult.allQuestions }),
          ...(content?.evaluation && { evaluation: content.evaluation }),
          ...(content?.evaluations && { evaluations: content.evaluations }),
          ...(content?.nextQuestion && { nextQuestion: content.nextQuestion }),
          ...(content?.isConcluded !== undefined && { isConcluded: content.isConcluded }),
          ...(content?.overallFeedback && { overallFeedback: content.overallFeedback }),
        };

        return response;
      } catch (err) {
        if (pollTask.stop) pollTask.stop();
        removeTaskSocketListener(taskId);

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
