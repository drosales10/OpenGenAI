import { buildInternalApiUrl, withInternalApiKeyHeaders } from './internalApi.js';

const PENDING_KEY = 'muapi_pending_jobs';

async function syncJobToDatabase(job) {
    try {
        const response = await fetch(buildInternalApiUrl('/api/db/jobs'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...withInternalApiKeyHeaders(),
            },
            body: JSON.stringify({
                request_id: job.requestId || null,
                user_id: job.userId || null,
                provider: job.provider || 'muapi',
                job_type: job.studioType || 'unknown',
                status: job.status || 'pending',
                approval_status: job.approvalStatus || 'approved',
                auto_approved: job.autoApproved ?? true,
                payload: job.payload || job.historyMeta || {},
                event_type: job.eventType || 'job_created',
                event_payload: {
                    requestId: job.requestId,
                    studioType: job.studioType,
                    maxAttempts: job.maxAttempts,
                    interval: job.interval,
                    submittedAt: job.submittedAt,
                    ...job.eventPayload,
                },
            }),
        });

        if (!response.ok && response.status !== 404) {
            const errText = await response.text();
            throw new Error(errText || `HTTP ${response.status}`);
        }
    } catch (error) {
        console.warn('[PendingJobs] Failed to update database status:', error.message);
    }
}

async function syncJobStatusToDatabase(requestId, update = {}) {
    if (!requestId) return;

    try {
        const response = await fetch(buildInternalApiUrl('/api/db/jobs'), {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...withInternalApiKeyHeaders(),
            },
            body: JSON.stringify({
                request_id: requestId,
                status: update.status,
                approval_status: update.approvalStatus,
                auto_approved: update.autoApproved,
                payload: update.payload,
                result: update.result,
                error_message: update.errorMessage,
                completed_at: update.completedAt || new Date().toISOString(),
                event_type: update.eventType,
                event_payload: update.eventPayload || {},
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || `HTTP ${response.status}`);
        }
    } catch (error) {
        console.warn('[PendingJobs] Failed to sync to database:', error.message);
    }
}

export function savePendingJob(job) {
    try {
        const jobs = getAllPendingJobs().filter(j => j.requestId !== job.requestId);
        jobs.push(job);
        localStorage.setItem(PENDING_KEY, JSON.stringify(jobs));
        void syncJobToDatabase(job);
    } catch (e) {
        console.warn('[PendingJobs] Failed to save:', e);
    }
}

export function removePendingJob(requestId, options = {}) {
    try {
        const jobs = getAllPendingJobs().filter(j => j.requestId !== requestId);
        localStorage.setItem(PENDING_KEY, JSON.stringify(jobs));

        if (options.sync !== false) {
            void syncJobStatusToDatabase(requestId, {
                status: options.status || 'completed',
                approvalStatus: options.approvalStatus,
                autoApproved: options.autoApproved,
                payload: options.payload,
                result: options.result,
                errorMessage: options.errorMessage,
                completedAt: options.completedAt,
                eventType: options.eventType || (options.status === 'failed' ? 'job_failed' : 'job_completed'),
                eventPayload: options.eventPayload,
            });
        }
    } catch (e) {
        console.warn('[PendingJobs] Failed to remove:', e);
    }
}

export function getPendingJobs(studioType) {
    const all = getAllPendingJobs();
    return studioType ? all.filter(j => j.studioType === studioType) : all;
}

function getAllPendingJobs() {
    try {
        return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    } catch {
        return [];
    }
}
