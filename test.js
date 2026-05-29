const mockSessions = [
  {
    "id": "sess_123",
    "customer_name": "Guest",
    "last_active": "2026-03-22 13:53:39",
    "last_message": "Hey, checking my notification system!",
    "unread_count": "1"
  }
];

let totalUnread = 0;
let newHtml = '';

try {
    mockSessions.forEach(s => {
        const cid = (s.id || '').replace(/'/g, "\\'");
        const cname = (s.customer_name || 'Guest').replace(/'/g, "\\'");
        const isActive = false;
        const time = s.last_active ? s.last_active.split(' ')[1] || s.last_active : '00:00';
        const unread = parseInt(s.unread_count || 0);
        totalUnread += unread;
        
        const unreadBadge = unread > 0 ? `<div style="background:var(--neon-blue); color:#000; font-size:0.7rem; font-weight:bold; border-radius:50%; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; margin-left:10px;">${unread}</div>` : '';
        const fontWeight = unread > 0 ? '900' : 'bold';
        const textColor = unread > 0 ? 'var(--neon-blue)' : 'white';
        
        newHtml += `HTML`;
    });
    console.log("Total Unread:", totalUnread);
    console.log("SUCCESS");
} catch(e) {
    console.error("ERROR:", e);
}
