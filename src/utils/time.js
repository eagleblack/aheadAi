export const timeAgo = (timestamp) => {
  if (!timestamp) return "";

  let date;

  // Handle Firestore Timestamp object
  if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } 
  // Handle JS Date or ISO string
  else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return ""; // prevent "Invalid Date"

  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // difference in seconds

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

  // fallback
  return date.toLocaleDateString();
};
