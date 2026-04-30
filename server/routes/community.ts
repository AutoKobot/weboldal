import { Router } from "express";
import { storage } from "../storage";
import { combinedAuth } from "./middleware";
import { insertCommunityGroupSchema, insertCommunityProjectSchema, insertDiscussionSchema, users, discussions } from "@shared/schema";
import { db } from "../db";
import { inArray } from "drizzle-orm";

const router = Router();

// SSE Clients: Map<userId, Set<res>>
const sseClients = new Map<string, Set<any>>();

function sendSseToUser(userId: string, data: object) {
  const clients = sseClients.get(userId);
  if (clients) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    clients.forEach(res => {
      try { res.write(payload); } catch { /* disconnected */ }
    });
  }
}

async function notifyGroupMembers(groupId: number, authorId: string, discussionTitle: string, discussionId: number) {
  try {
    const members = await storage.getGroupMembers(groupId);
    const group = await storage.getCommunityGroup(groupId);
    const author = await storage.getUser(authorId);
    const authorName = author?.firstName ? `${author.firstName} ${author.lastName || ''}`.trim() : author?.username || 'Valaki';

    for (const member of members) {
      if (member.userId === authorId) continue;
      const notif = await storage.createNotification({
        userId: member.userId, type: "discussion_reply",
        title: `Új bejegyzés: ${group?.name || 'Csoport'}`,
        message: `${authorName} elindított egy új témát: "${discussionTitle}"`,
        link: "/community", isRead: false, actorId: authorId,
        metadata: { groupId, discussionId },
      });
      sendSseToUser(member.userId, { type: "notification", data: notif });
    }
  } catch (err) {
    console.error("Error sending group notifications:", err);
  }
}

// --- Groups ---
router.get('/groups/leaderboard', combinedAuth, async (req, res) => {
  try { res.json(await storage.getCommunityLeaderboard()); } catch (e) { res.status(500).json({ message: "Error" }); }
});

router.get('/groups', combinedAuth, async (req: any, res) => {
  try {
    const professionId = req.query.professionId ? parseInt(req.query.professionId as string) : undefined;
    const groups = await storage.getCommunityGroups(professionId);
    const userId = req.user.id;
    
    // Optimized: Get all members for all relevant groups in one query (if supported by storage)
    // For now, if getGroupMembers is called many times, we can at least make it more efficient
    const enriched = await Promise.all(groups.map(async (g) => {
      const members = await storage.getGroupMembers(g.id);
      return { ...g, realMemberCount: members.length, isMember: members.some(m => m.userId === userId) };
    }));
    res.json(enriched);
  } catch (e) { res.status(500).json({ message: "Error" }); }
});

router.post('/groups', combinedAuth, async (req: any, res) => {
  try {
    const data = insertCommunityGroupSchema.parse({ ...req.body, createdBy: req.user.id });
    const group = await storage.createCommunityGroup(data);
    await storage.joinCommunityGroup(group.id, req.user.id);
    res.status(201).json(group);
  } catch (e) { res.status(500).json({ message: "Error" }); }
});

router.post('/groups/:id/join', combinedAuth, async (req: any, res) => {
  try {
    await storage.joinCommunityGroup(parseInt(req.params.id), req.user.id);
    res.json({ message: "Joined" });
  } catch (e) { res.status(500).json({ message: "Error" }); }
});

router.post('/groups/:id/leave', combinedAuth, async (req: any, res) => {
  try {
    await storage.leaveCommunityGroup(parseInt(req.params.id), req.user.id);
    res.json({ message: "Left" });
  } catch (e) { res.status(500).json({ message: "Error" }); }
});

// --- Discussions ---
router.get('/discussions', combinedAuth, async (req: any, res) => {
  try {
    const { groupId, projectId, search, tag } = req.query;
    let rows = await storage.getDiscussions(
      groupId ? parseInt(groupId as string) : undefined, 
      projectId ? parseInt(projectId as string) : undefined
    );
    if (search) {
      const q = (search as string).toLowerCase();
      rows = rows.filter(d => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q));
    }
    if (tag) rows = rows.filter(d => d.tags?.includes(tag as string));

    if (rows.length === 0) return res.json([]);

    const discussionIds = rows.map(d => d.id);
    const authorIds = [...new Set(rows.map(d => d.authorId))];

    // Batch fetch all needed data
    const [allAuthors, allReplies, allReactions] = await Promise.all([
      db.select().from(users).where(inArray(users.id, authorIds)),
      db.select({ id: discussions.id, parentId: discussions.parentId }).from(discussions).where(inArray(discussions.parentId, discussionIds)),
      storage.getReactionsForDiscussions(discussionIds)
    ]);

    // Create maps for efficient lookups
    const authorMap = new Map(allAuthors.map(a => [a.id, a]));
    const repliesByParent = new Map<number, any[]>();
    allReplies.forEach(r => {
      if (r.parentId) {
        if (!repliesByParent.has(r.parentId)) repliesByParent.set(r.parentId, []);
        repliesByParent.get(r.parentId)!.push(r);
      }
    });
    
    const reactionsByDiscussion = new Map<number, any[]>();
    allReactions.forEach(r => {
      if (!reactionsByDiscussion.has(r.discussionId)) reactionsByDiscussion.set(r.discussionId, []);
      reactionsByDiscussion.get(r.discussionId)!.push(r);
    });

    const enriched = rows.map((d) => {
      const author = authorMap.get(d.authorId);
      const replies = repliesByParent.get(d.id) || [];
      const reactions = reactionsByDiscussion.get(d.id) || [];
      
      const reactionMap: any = {};
      reactions.forEach(r => {
        if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, mine: false };
        reactionMap[r.emoji].count++;
        if (r.userId === req.user.id) reactionMap[r.emoji].mine = true;
      });

      return { 
        ...d, 
        author: { username: author?.username, profileImageUrl: author?.profileImageUrl },
        replyCount: replies.length,
        reactions: reactionMap
      };
    });
    res.json(enriched);
  } catch (e) { res.status(500).json({ message: "Error" }); }
});

router.post('/discussions', combinedAuth, async (req: any, res) => {
  try {
    const data = insertDiscussionSchema.parse({ ...req.body, authorId: req.user.id });
    const discussion = await storage.createDiscussion(data);
    if (discussion.groupId) {
      notifyGroupMembers(discussion.groupId, req.user.id, discussion.title, discussion.id).catch(console.error);
    }
    res.status(201).json(discussion);
  } catch (e) { res.status(500).json({ message: "Error" }); }
});

router.post('/discussions/:id/react', combinedAuth, async (req: any, res) => {
  try {
    const { emoji } = req.body;
    if (!["👍", "❤️", "🔥", "💡"].includes(emoji)) return res.status(400).end();
    const result = await storage.toggleReaction(parseInt(req.params.id), req.user.id, emoji);
    res.json(result);
  } catch (e) { res.status(500).json({ message: "Error" }); }
});

// --- Notifications SSE ---
router.get('/notifications/stream', combinedAuth, (req: any, res) => {
  const userId = req.user.id;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId)!.add(res);

  const keepAlive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(keepAlive); }
  }, 30000);

  req.on("close", () => {
    clearInterval(keepAlive);
    sseClients.get(userId)?.delete(res);
  });
});

router.get('/notifications', combinedAuth, async (req: any, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
    const notifications = await storage.getNotifications(req.user.id, limit);
    const unreadCount = await storage.getUnreadCount(req.user.id);
    res.json({ notifications, unreadCount });
  } catch (e) { res.status(500).json({ message: "Error" }); }
});

router.patch('/notifications/:id/read', combinedAuth, async (req: any, res) => {
  try {
    await storage.markNotificationRead(parseInt(req.params.id), req.user.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: "Error" }); }
});

export default router;
