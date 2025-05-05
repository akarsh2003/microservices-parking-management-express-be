exports.calculateHours = (entryTime, exitTime) => {
    const diffMs = exitTime - entryTime;
    return Math.ceil(diffMs / (1000 * 60 * 60)); // round up to next hour
  };
  