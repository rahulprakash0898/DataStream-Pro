// Progress tracking for frontend
const progressStore = new Map();

export const setProgress = (id, data) => {
  progressStore.set(id, data);
};

export const getProgress = (id) => {
  return progressStore.get(id) || { processed: 0, total: 0, percentage: 0, type: 'unknown' };
};

export const deleteProgress = (id) => {
  progressStore.delete(id);
};