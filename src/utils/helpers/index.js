export function serializeForClient(data) {
    return JSON.parse(JSON.stringify(data));
}

export function mongooseFormatTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
    if (seconds < 60)       return "Edited just now";
    if (seconds < 3600)     return `Edited ${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 7200)     return "Edited 1 hour ago";
    if (seconds < 86400)    return `Edited ${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 172800)   return "Edited yesterday";
    if (seconds < 2592000)  return `Edited ${Math.floor(seconds / 86400)} days ago`;
    if (seconds < 31536000) return `Edited ${Math.floor(seconds / 2592000)} months ago`;
  
    return `Edited ${Math.floor(seconds / 31536000)} years ago`;
}