import { io } from 'socket.io-client';

let socket = null;
const taskListeners = new Map();

export function getSocketUrl() {
  const envUrl = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_BASE_URL;
  if (envUrl) return envUrl;
  return window.location.origin;
}

export function initSocket(userId) {
  if (!userId) return null;

  if (socket && socket.connected && socket.userId === userId) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  const serverUrl = getSocketUrl();
  socket = io(serverUrl, {
    query: { userId },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.userId = userId;

  socket.on('connect', () => {
    console.log('⚡ [Socket.IO] Connected to server as user:', userId);
  });

  socket.on('task:completed', (data) => {
    console.log('⚡ [Socket.IO] task:completed received:', data);
    if (data && data.taskId && taskListeners.has(data.taskId)) {
      const { resolve } = taskListeners.get(data.taskId);
      taskListeners.delete(data.taskId);
      resolve(data);
    }
  });

  socket.on('task:failed', (data) => {
    console.warn('⚡ [Socket.IO] task:failed received:', data);
    if (data && data.taskId && taskListeners.has(data.taskId)) {
      const { reject } = taskListeners.get(data.taskId);
      taskListeners.delete(data.taskId);
      reject(new Error(data.error || 'Task failed to process.'));
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('⚡ [Socket.IO] Disconnected:', reason);
  });

  return socket;
}

export function waitForTaskSocket(taskId, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (taskListeners.has(taskId)) {
        taskListeners.delete(taskId);
      }
    }, timeoutMs);

    taskListeners.set(taskId, {
      resolve: (data) => {
        clearTimeout(timer);
        resolve(data);
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    });
  });
}

export function removeTaskSocketListener(taskId) {
  if (taskListeners.has(taskId)) {
    taskListeners.delete(taskId);
  }
}

export default {
  initSocket,
  waitForTaskSocket,
  removeTaskSocketListener,
  getSocketUrl,
};
