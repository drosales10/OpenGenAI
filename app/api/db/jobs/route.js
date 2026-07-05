import { NextResponse } from 'next/server';
import { appendJobEvent, createJob, listJobs, updateJobByRequestId } from '@/src/lib/db/jobs';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || 25;
    const jobs = await listJobs(limit);

    return NextResponse.json({
      ok: true,
      jobs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.provider || !body.job_type) {
      return NextResponse.json(
        {
          ok: false,
          error: 'provider and job_type are required',
        },
        { status: 400 }
      );
    }

    const job = await createJob({
      requestId: body.request_id,
      userId: body.user_id,
      provider: body.provider,
      jobType: body.job_type,
      payload: body.payload || {},
      autoApproved: body.auto_approved,
      approvalStatus: body.approval_status,
      status: body.status,
      result: body.result,
      errorMessage: body.error_message,
      completedAt: body.completed_at,
    });

    if (body.event_type) {
      await appendJobEvent(job.id, body.event_type, body.event_payload || {});
    }

    return NextResponse.json({
      ok: true,
      job,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    if (!body.request_id) {
      return NextResponse.json(
        {
          ok: false,
          error: 'request_id is required',
        },
        { status: 400 }
      );
    }

    const job = await updateJobByRequestId(body.request_id, {
      status: body.status,
      approvalStatus: body.approval_status,
      autoApproved: body.auto_approved,
      payload: body.payload,
      result: body.result,
      errorMessage: body.error_message,
      completedAt: body.completed_at,
    });

    if (!job) {
      return NextResponse.json(
        {
          ok: false,
          error: `Job not found for request_id ${body.request_id}`,
        },
        { status: 404 }
      );
    }

    if (body.event_type) {
      await appendJobEvent(job.id, body.event_type, body.event_payload || {});
    }

    return NextResponse.json({
      ok: true,
      job,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
