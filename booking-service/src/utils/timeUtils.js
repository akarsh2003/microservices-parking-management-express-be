export const calculateHours = (entry, exit) => {
  const ms = new Date(exit) - new Date(entry);
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60)));
};
