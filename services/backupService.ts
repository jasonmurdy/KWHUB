
import { Team, Project, Task } from '../types';

export const backupService = {
    /**
     * Aggregates team data into a JSON structure
     */
    generateTeamBackup(team: Team, projects: Project[], tasks: Task[]): string {
        const backupData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            team: {
                id: team.id,
                name: team.name,
                description: team.description,
                memberCount: team.memberIds.length
            },
            projects: projects.map(p => ({
                id: p.id,
                name: p.name,
                description: p.description,
                workflow: p.workflow,
                taskCount: tasks.filter(t => t.projectId === p.id).length,
                tasks: tasks.filter(t => t.projectId === p.id)
            }))
        };
        try {
            return JSON.stringify(backupData, null, 2);
        } catch (e) {
            console.error("Failed to stringify backup data:", e);
            // Fallback to a safer stringify or return a simple error object
            return JSON.stringify({ error: "Failed to generate backup due to complex data structure." });
        }
    },

    /**
     * Uploads a file content string to Google Drive using the provided access token.
     * folderId is optional; if provided, the file is created inside that folder.
     */
    async uploadToDrive(accessToken: string, filename: string, content: string, folderId?: string): Promise<unknown> {
        const metadata: { name: string; mimeType: string; description: string; parents?: string[] } = {
            name: filename,
            mimeType: 'application/json',
            description: 'KW Hub Team Backup'
        };

        if (folderId) {
            metadata.parents = [folderId];
        }

        const boundary = '-------kwhub_backup_boundary';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const closeDelimiter = "\r\n--" + boundary + "--";

        const body =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            content +
            closeDelimiter;

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: body
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Google Drive Upload Failed: ${response.status} ${error}`);
        }

        return response.json();
    }
};
