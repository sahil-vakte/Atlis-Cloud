import { handler, ok } from '@/lib/api';
import { exec, query } from '@/lib/db';
export const GET = handler(async (_r, _c, user) => {
  const rows = await query<any>(`SELECT n.notificationID id, n.type, n.description, n.notificationURL url, n.created_at,
      EXISTS(SELECT 1 FROM notificationusers nu WHERE nu.notificationID=n.notificationID AND nu.userID=?) seen
    FROM notification n WHERE FIND_IN_SET(?, n.assignedUserID) OR n.assignedUserID=? ORDER BY n.notificationID DESC LIMIT 30`, [user.id, String(user.id), String(user.id)]);
  return ok({ items: rows, unread: rows.filter((r) => !Number(r.seen)).length });
});
export const POST = handler(async (_r, _c, user) => {
  await exec(`INSERT INTO notificationusers (userID, notificationID) SELECT ?, n.notificationID FROM notification n
    WHERE (FIND_IN_SET(?, n.assignedUserID) OR n.assignedUserID=?) AND NOT EXISTS (SELECT 1 FROM notificationusers nu WHERE nu.notificationID=n.notificationID AND nu.userID=?)`, [user.id, String(user.id), String(user.id), user.id]);
  return ok({ status: 'success' });
});

export const dynamic = 'force-dynamic';
