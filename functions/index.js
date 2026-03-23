const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: "*" });

admin.initializeApp();
const db = admin.firestore();

// --- CONSTANTS ---
const SYSTEM_AVATAR = `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3e%3cdefs%3e%3clinearGradient id='g' x1='0' y1='1' x2='1' y2='0'%3e%3cstop offset='0%25' stop-color='%236b21a8'/%3e%3cstop offset='50%25' stop-color='%23be185d'/%3e%3cstop offset='100%25' stop-color='%23f97316'/%3e%3c/linearGradient%3e%3c/defs%3e%3cg stroke='url(%23g)' stroke-width='10' fill='none' stroke-linecap='round'%3e%3cellipse cx='50' cy='50' rx='40' ry='20' transform='rotate(30 50 50)'/%3e%3cellipse cx='50' cy='50' rx='40' ry='20' transform='rotate(-30 50 50)'/%3e%3cellipse cx='50' cy='50' rx='20' ry='40' transform='rotate(60 50 50)'/%3e%3cellipse cx='50' cy='50' rx='20' ry='40' transform='rotate(-60 50 50)'/%3e%3c/g%3e%3c/svg%3e`;

// --- HELPERS ---

/**
 * Safely converts any timestamp-like value to a Date object.
 */
const toDate = (val) => {
    if (!val) return new Date(0);
    if (typeof val.toDate === 'function') return val.toDate();
    if (val && typeof val === 'object' && val.seconds !== undefined) {
        return new Date(val.seconds * 1000 + (val.nanoseconds || 0) / 1000000);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date(0) : d;
};

/**
 * Chunks an array into smaller arrays of a specified size.
 */
const chunkArray = (arr, size) => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
    );
};

/**
 * Sends a JSON payload to a webhook URL.
 */
async function sendWebhook(url, payload) {
    const fetchFn = typeof fetch === 'function' ? fetch : (typeof globalThis !== 'undefined' && globalThis.fetch);
    if (typeof fetchFn !== 'function') {
        throw new Error("Fetch API is not available in this environment.");
    }

    console.log(`[DAILY_SUMMARY] Sending webhook to: ${url}`);
    const response = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Webhook failed with status ${response.status}: ${text}`);
    }
    return response;
}

// --- CORE LOGIC: DAILY SUMMARIES ---

/**
 * Processes daily summaries for one or all teams.
 */
async function processDailySummaries(specificTeamId = null) {
    console.log(`[DAILY_SUMMARY] Starting process. Specific team: ${specificTeamId || 'All'}`);
    
    try {
        // 1. Fetch relevant teams
        let teamsToProcess = [];
        if (specificTeamId) {
            const teamDoc = await db.collection("teams").doc(specificTeamId).get();
            if (teamDoc.exists) {
                teamsToProcess.push({ id: teamDoc.id, ...teamDoc.data() });
            }
        } else {
            const teamsSnap = await db.collection("teams").get();
            teamsToProcess = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        // Filter for teams that actually have a webhook and members
        const activeTeams = teamsToProcess.filter(t => 
            t.dailySummaryWebhook && 
            t.dailySummaryWebhook.startsWith('http') && 
            Array.isArray(t.memberIds) && 
            t.memberIds.length > 0
        );

        console.log(`[DAILY_SUMMARY] Found ${activeTeams.length} teams with valid webhooks.`);
        if (activeTeams.length === 0) return { success: true, message: "No teams to process." };

        // 2. Pre-fetch shared data (Users & Projects)
        const [usersSnap, projectsSnap] = await Promise.all([
            db.collection("users").get(),
            db.collection("projects").get()
        ]);

        const usersMap = new Map();
        usersSnap.forEach(doc => usersMap.set(doc.id, doc.data()));

        const projectsMap = new Map();
        projectsSnap.forEach(doc => {
            const data = doc.data();
            const doneIds = (data.workflow || [])
                .filter(s => s && ['done', 'complete', 'closed', 'archived', 'launched', 'leased', 'sold'].includes(s.name?.toLowerCase()))
                .map(s => s.id);
            projectsMap.set(doc.id, {
                name: data.name || 'Unnamed Project',
                doneStatusIds: new Set(doneIds)
            });
        });

        // 3. Process each team
        const today = new Date();
        today.setHours(0,0,0,0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        nextWeek.setHours(23, 59, 59, 999);

        const teamResults = [];

        for (const team of activeTeams) {
            try {
                console.log(`[DAILY_SUMMARY] Processing team: ${team.name} (${team.id})`);
                
                // Fetch all tasks for all members of this team
                // Firestore limit: array-contains-any max 10 elements
                const memberChunks = chunkArray(team.memberIds, 10);
                console.log(`[DAILY_SUMMARY] Member chunks: ${memberChunks.length}`);
                const taskPromises = memberChunks.map(ids => 
                    db.collection("tasks").where("assigneeIds", "array-contains-any", ids).get()
                );
                
                console.log(`[DAILY_SUMMARY] Fetching tasks...`);
                const taskSnaps = await Promise.all(taskPromises);
                console.log(`[DAILY_SUMMARY] Tasks fetched.`);
                const teamTasks = [];
                const seenTaskIds = new Set();
                
                taskSnaps.forEach(snap => {
                    snap.forEach(doc => {
                        if (!seenTaskIds.has(doc.id)) {
                            teamTasks.push({ id: doc.id, ...doc.data() });
                            seenTaskIds.add(doc.id);
                        }
                    });
                });
                console.log(`[DAILY_SUMMARY] Total team tasks: ${teamTasks.length}`);

                const memberSummaries = [];

                for (const memberId of team.memberIds) {
                    const member = usersMap.get(memberId);
                    if (!member) continue;

                    const tasks = teamTasks.filter(t => (t.assigneeIds || []).includes(memberId));
                    const overdue = [];
                    const dueToday = [];
                    const dueSoon = [];

                    tasks.forEach(task => {
                        const project = projectsMap.get(task.projectId);
                        if (!project) return;

                        // Skip completed tasks
                        if (project.doneStatusIds.has(task.statusId || task.status)) return;
                        
                        // Use dueDate, targetDate, or eventDate for summary
                        const relevantDate = task.dueDate || task.targetDate || task.eventDate;
                        if (!relevantDate) return;

                        const dueDate = toDate(relevantDate);
                        dueDate.setHours(0,0,0,0);

                        const taskInfo = {
                            title: task.title,
                            project: project.name,
                            dueDate: dueDate.toLocaleDateString(),
                            priority: task.priority,
                            type: task.dueDate ? 'Due' : (task.targetDate ? 'Target' : 'Event')
                        };

                        if (dueDate < today) overdue.push(taskInfo);
                        else if (dueDate.getTime() === today.getTime()) dueToday.push(taskInfo);
                        else if (dueDate > today && dueDate <= nextWeek) dueSoon.push(taskInfo);
                    });

                    if (overdue.length > 0 || dueToday.length > 0 || dueSoon.length > 0) {
                        memberSummaries.push({
                            name: member.name,
                            overdue,
                            dueToday,
                            dueSoon
                        });
                    }
                }

                if (memberSummaries.length === 0) {
                    console.log(`[DAILY_SUMMARY] No tasks for team ${team.id}.`);
                    teamResults.push({ teamId: team.id, status: 'skipped', reason: 'no tasks' });
                    continue;
                }

                // 4. Construct and send message
                let text = `🌅 *Daily Briefing: ${team.name}*\n\n`;
                memberSummaries.forEach(m => {
                    text += `👤 *${m.name}*\n`;
                    if (m.overdue.length > 0) {
                        text += `  🚨 ${m.overdue.length} Overdue\n`;
                        m.overdue.forEach(t => text += `    • ${t.title} (${t.project}) - ${t.type}: ${t.dueDate}\n`);
                    }
                    if (m.dueToday.length > 0) {
                        text += `  📅 ${m.dueToday.length} Due Today\n`;
                        m.dueToday.forEach(t => text += `    • ${t.title} (${t.project}) - ${t.type}: ${t.dueDate}\n`);
                    }
                    if (m.dueSoon.length > 0) {
                        text += `  🔜 ${m.dueSoon.length} Due Next 7 Days\n`;
                        m.dueSoon.forEach(t => text += `    • ${t.title} (${t.project}) - ${t.type}: ${t.dueDate}\n`);
                    }
                    text += `\n`;
                });

                await sendWebhook(team.dailySummaryWebhook, { text: text.trim() });
                console.log(`[DAILY_SUMMARY] Webhook sent for team ${team.id}`);
                teamResults.push({ teamId: team.id, status: 'success' });

            } catch (err) {
                console.error(`[DAILY_SUMMARY] Error processing team ${team.id}:`, err);
                teamResults.push({ teamId: team.id, status: 'error', error: err.message });
            }
        }

        return { success: true, results: teamResults };

    } catch (error) {
        console.error("[DAILY_SUMMARY] Fatal error:", error);
        throw new functions.https.HttpsError('internal', `Daily summary failed: ${error.message}`);
    }
}

// --- EXPORTED FUNCTIONS ---

// 1. Scheduled Daily Summary
exports.sendDailySummaryToWebhook = functions.runWith({ timeoutSeconds: 300 }).pubsub.schedule("every day 09:00")
  .timeZone("America/Toronto")
  .onRun(async () => {
    return await processDailySummaries();
  });

// 2. Manual Daily Summary Trigger
exports.triggerDailySummaryManually = functions.runWith({ timeoutSeconds: 300 }).https.onCall(async (data) => {
    console.log("[DAILY_SUMMARY] Manual trigger for team:", data.teamId);
    if (!data.teamId || typeof data.teamId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid teamId.');
    }
    return await processDailySummaries(data.teamId);
});

// 3. Automated Audit Logging & Recurring Tasks
exports.onTaskUpdate = functions.firestore.document('tasks/{taskId}').onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const taskId = context.params.taskId;

    // Detect changes
    const statusChanged = before.status !== after.status;
    const assigneesChanged = JSON.stringify(before.assigneeIds || []) !== JSON.stringify(after.assigneeIds || []);

    if (!statusChanged && !assigneesChanged) return null;

    const auditEntries = [];
    const now = new Date();

    if (statusChanged) {
        auditEntries.push({
            id: `status_${Date.now()}`,
            action: 'Status Change',
            details: `Moved from ${before.status} to ${after.status}`,
            timestamp: now.toISOString(),
            user: { id: 'system', name: 'System', avatarUrl: SYSTEM_AVATAR }
        });

        // Handle Recurring Tasks
        const doneStatuses = ['done', 'complete', 'closed', 'archived', 'launched', 'leased', 'sold'];
        const isNowDone = doneStatuses.includes(after.status.toLowerCase());
        const wasNotDone = !doneStatuses.includes(before.status.toLowerCase());

        if (isNowDone && wasNotDone && after.recurrence && after.recurrence !== 'none') {
            console.log(`[RECURRENCE] Task ${taskId} completed. Creating next occurrence...`);
            
            const nextTask = { ...after };
            delete nextTask.id;
            nextTask.status = 'todo'; // Reset status
            nextTask.auditTrail = []; // Clear audit trail
            nextTask.createdAt = admin.firestore.FieldValue.serverTimestamp();
            nextTask.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            
            // Calculate next dates
            const calculateNextDate = (dateStr, recurrence) => {
                if (!dateStr) return null;
                const date = toDate(dateStr);
                if (recurrence === 'daily') date.setDate(date.getDate() + 1);
                else if (recurrence === 'weekly') date.setDate(date.getDate() + 7);
                else if (recurrence === 'monthly') date.setMonth(date.getMonth() + 1);
                return date.toISOString();
            };

            if (after.startDate) nextTask.startDate = calculateNextDate(after.startDate, after.recurrence);
            if (after.dueDate) nextTask.dueDate = calculateNextDate(after.dueDate, after.recurrence);
            if (after.targetDate) nextTask.targetDate = calculateNextDate(after.targetDate, after.recurrence);
            if (after.eventDate) nextTask.eventDate = calculateNextDate(after.eventDate, after.recurrence);

            await db.collection('tasks').add(nextTask);
            console.log(`[RECURRENCE] Next occurrence created for task ${taskId}`);
        }
    }

    if (assigneesChanged) {
        auditEntries.push({
            id: `assign_${Date.now()}`,
            action: 'Assignment Update',
            details: `Assignees updated`,
            timestamp: now.toISOString(),
            user: { id: 'system', name: 'System', avatarUrl: SYSTEM_AVATAR }
        });
    }

    return db.collection('tasks').doc(taskId).update({
        auditTrail: admin.firestore.FieldValue.arrayUnion(...auditEntries)
    });
});

// 4. Notification Alerts
exports.onNotificationCreate = functions.firestore.document('notifications/{notifId}').onCreate(async (snap) => {
    const notification = snap.data();
    console.log(`[NOTIFICATION] ${notification.type}: ${notification.message}`);
    return null;
});

// 5. Email Ingestion
exports.processIncomingEmail = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
        try {
            const { sender, recipient, subject, body } = req.body;
            const projectMatch = recipient.match(/project-([^@]+)@/);
            if (!projectMatch) return res.status(200).send('Ignored');

            const projectId = projectMatch[1];
            const projectDoc = await db.collection('projects').doc(projectId).get();
            if (!projectDoc.exists) return res.status(404).send('Project not found');

            const projectData = projectDoc.data();
            const defaultStatus = projectData.workflow?.[0]?.id || 'backlog';

            await db.collection('tasks').add({
                projectId,
                title: subject,
                description: body || '',
                status: defaultStatus,
                priority: 'Medium',
                assigneeIds: [],
                memberIds: projectData.memberIds || [],
                reporterId: 'email-system',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                dueDate: new Date(),
                startDate: new Date(),
                auditTrail: [{
                    id: Date.now().toString(),
                    user: { id: 'system', name: 'Email', avatarUrl: SYSTEM_AVATAR },
                    action: 'Created via Email',
                    details: `From: ${sender}`,
                    timestamp: new Date().toISOString()
                }]
            });

            res.status(200).send('Task created');
        } catch (error) {
            console.error('Email error:', error);
            res.status(500).send('Internal Error');
        }
    });
});

// 6. Generic Automation Webhook
exports.handleGenericWebhook = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
        try {
            const { projectId, title, description, priority, status } = req.body;
            if (!projectId || !title) return res.status(400).send('Missing required fields');

            const projectDoc = await db.collection('projects').doc(projectId).get();
            if (!projectDoc.exists) return res.status(404).send('Project not found');

            await db.collection('tasks').add({
                projectId,
                title,
                description: description || '',
                status: status || 'backlog',
                priority: priority || 'Medium',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                reporterId: 'webhook'
            });

            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Webhook error:', error);
            res.status(500).send('Internal Error');
        }
    });
});

// 7. Google Chat Integration
exports.notifyGoogleChat = functions.firestore.document("tasks/{taskId}").onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after) return null;

    const projectDoc = await db.collection("projects").doc(after.projectId).get();
    if (!projectDoc.exists) return null;

    const webhookUrl = projectDoc.data().integrations?.googleChatWebhook;
    if (!webhookUrl) return null;

    const title = change.before.exists ? "Task Updated" : "New Task Created";
    const text = `<b>${after.title}</b>\nProject: ${projectDoc.data().name}`;

    try {
        await sendWebhook(webhookUrl, {
            cardsV2: [{
                cardId: `task-${context.params.taskId}`,
                card: {
                    header: { title, subtitle: projectDoc.data().name },
                    sections: [{ widgets: [{ textParagraph: { text } }] }]
                }
            }]
        });
    } catch (error) {
        console.error("Google Chat error:", error);
    }
    return null;
});

// 8. Proxy for testing webhooks
exports.testWebhook = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
        const { url, payload } = req.body;
        try {
            const response = await sendWebhook(url, payload);
            const text = await response.text();
            res.status(response.status).send(text);
        } catch (error) {
            res.status(500).send(error.message);
        }
    });
});
