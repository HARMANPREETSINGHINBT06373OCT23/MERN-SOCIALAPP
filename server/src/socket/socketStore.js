// In-memory socket store
// userId => Set(socketId)

const onlineUsers = new Map();

export const addUserSocket = (userId, socketId) => {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
};

export const removeUserSocket = (userId, socketId) => {
  if (!onlineUsers.has(userId)) return;

  const sockets = onlineUsers.get(userId);
  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(userId);
  }
};

export const getUserSockets = (userId) => {
  return onlineUsers.get(userId) || new Set();
};

export const getOnlineUsers = () => {
  return [...onlineUsers.keys()];
};
