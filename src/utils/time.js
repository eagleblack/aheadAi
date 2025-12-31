export const timeAgo = (timestamp) => {
  if (!timestamp) return "";

  let date;

  // Handle Firestore Timestamp
  if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } 
  // Handle JS Date or ISO string
  else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffSeconds = Math.floor((now - date) / 1000);

  const minute = 60;
  const hour = 3600;
  const day = 86400;
  const year = 365 * day;

  if (diffSeconds < minute) return "Just now";
  if (diffSeconds < hour) return `${Math.floor(diffSeconds / minute)}m ago`;
  if (diffSeconds < day) return `${Math.floor(diffSeconds / hour)}h ago`;
  if (diffSeconds < year) return `${Math.floor(diffSeconds / day)}d ago`;

  // ✅ fallback after 365 days
  return date.toLocaleDateString();
};
