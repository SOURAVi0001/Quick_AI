import sql from '../configs/db.js';
import { addTask } from '../configs/queue.js';
import { safeDel, safeGet, safeSetEx } from '../configs/redis.js';
import { ValidationError, ForbiddenError, NotFoundError } from '../middlewares/errors.js';

const VALID_STATUSES = [
  'Saved',
  'Applied',
  'Online Assessment',
  'Interview',
  'Final Round',
  'Offer',
  'Rejected',
  'Withdrawn'
];

// Helper to validate input status
const validateStatus = (status) => {
  if (status && !VALID_STATUSES.includes(status)) {
    throw new ValidationError(`Invalid application status: ${status}. Allowed: ${VALID_STATUSES.join(', ')}`);
  }
};

// Create a job application
export const createApplication = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const {
      company,
      role,
      jobUrl,
      jobDescription,
      location,
      employmentType,
      appliedDate,
      status = 'Saved',
      recruiterName,
      recruiterEmail,
      recruiterLinkedIn,
      resumeReference,
      notes,
      nextAction,
      nextActionDate
    } = req.body;

    if (!company || !role) {
      throw new ValidationError('Company and role are required fields');
    }

    validateStatus(status);

    // Insert application
    const [application] = await sql`
      INSERT INTO job_applications (
        user_id, company, role, job_url, job_description, location,
        employment_type, applied_date, status, recruiter_name, recruiter_email,
        recruiter_linkedin, resume_reference, notes, next_action, next_action_date
      ) VALUES (
        ${userId}, ${company}, ${role}, ${jobUrl || null}, ${jobDescription || null}, ${location || null},
        ${employmentType || null}, ${appliedDate || null}, ${status}, ${recruiterName || null}, ${recruiterEmail || null},
        ${recruiterLinkedIn || null}, ${resumeReference || null}, ${notes || null}, ${nextAction || null}, ${nextActionDate || null}
      ) RETURNING *
    `;

    // Create activity record
    await sql`
      INSERT INTO job_application_activities (
        application_id, user_id, type, new_status, note
      ) VALUES (
        ${application.id}, ${userId}, 'APPLICATION_CREATED', ${status}, 'Job application created'
      )
    `;

    // Invalidate caches
    await safeDel(`user:applications:${userId}`);

    res.status(210 || 201).json({ success: true, content: application });
  } catch (error) {
    next(error);
  }
};

// List applications with search, pagination, filtering, sorting
export const listApplications = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const {
      page = 1,
      limit = 20,
      search,
      status,
      role,
      location,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const searchPattern = search ? `%${search}%` : null;
    const statusFilter = status || null;
    const roleFilter = role || null;
    const locationFilter = location || null;

    const allowedSortCols = ['company', 'role', 'status', 'applied_date', 'created_at', 'updated_at'];
    const sortCol = allowedSortCols.includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const items = await sql`
      SELECT * FROM job_applications
      WHERE user_id = ${userId}
        AND (${statusFilter}::varchar IS NULL OR status = ${statusFilter})
        AND (${roleFilter}::varchar IS NULL OR role = ${roleFilter})
        AND (${locationFilter}::varchar IS NULL OR location = ${locationFilter})
        AND (
          ${searchPattern}::varchar IS NULL 
          OR company ILIKE ${searchPattern}
          OR role ILIKE ${searchPattern}
          OR location ILIKE ${searchPattern}
          OR recruiter_name ILIKE ${searchPattern}
          OR notes ILIKE ${searchPattern}
        )
      ORDER BY
        CASE WHEN ${sortCol} = 'company' AND ${sortDir} = 'ASC' THEN company END ASC,
        CASE WHEN ${sortCol} = 'company' AND ${sortDir} = 'DESC' THEN company END DESC,
        CASE WHEN ${sortCol} = 'role' AND ${sortDir} = 'ASC' THEN role END ASC,
        CASE WHEN ${sortCol} = 'role' AND ${sortDir} = 'DESC' THEN role END DESC,
        CASE WHEN ${sortCol} = 'status' AND ${sortDir} = 'ASC' THEN status END ASC,
        CASE WHEN ${sortCol} = 'status' AND ${sortDir} = 'DESC' THEN status END DESC,
        CASE WHEN ${sortCol} = 'applied_date' AND ${sortDir} = 'ASC' THEN applied_date END ASC,
        CASE WHEN ${sortCol} = 'applied_date' AND ${sortDir} = 'DESC' THEN applied_date END DESC,
        CASE WHEN ${sortCol} = 'created_at' AND ${sortDir} = 'ASC' THEN created_at END ASC,
        CASE WHEN ${sortCol} = 'created_at' AND ${sortDir} = 'DESC' THEN created_at END DESC,
        CASE WHEN ${sortCol} = 'updated_at' AND ${sortDir} = 'ASC' THEN updated_at END ASC,
        CASE WHEN ${sortCol} = 'updated_at' AND ${sortDir} = 'DESC' THEN updated_at END DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const countResult = await sql`
      SELECT COUNT(*) FROM job_applications
      WHERE user_id = ${userId}
        AND (${statusFilter}::varchar IS NULL OR status = ${statusFilter})
        AND (${roleFilter}::varchar IS NULL OR role = ${roleFilter})
        AND (${locationFilter}::varchar IS NULL OR location = ${locationFilter})
        AND (
          ${searchPattern}::varchar IS NULL 
          OR company ILIKE ${searchPattern}
          OR role ILIKE ${searchPattern}
          OR location ILIKE ${searchPattern}
          OR recruiter_name ILIKE ${searchPattern}
          OR notes ILIKE ${searchPattern}
        )
    `;

    const total = parseInt(countResult[0]?.count || '0', 10);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      items,
      page: pageNum,
      limit: limitNum,
      totalItems: total,
      totalPages
    });
  } catch (error) {
    next(error);
  }
};

// Retrieve a single job application
export const getApplicationDetail = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { id } = req.params;

    const [application] = await sql`
      SELECT * FROM job_applications WHERE id = ${id}
    `;

    if (!application) {
      throw new NotFoundError('Job application');
    }

    if (application.user_id !== userId) {
      throw new ForbiddenError('You do not own this job application');
    }

    // Retrieve corresponding timeline activity
    const activities = await sql`
      SELECT * FROM job_application_activities 
      WHERE application_id = ${id} 
      ORDER BY created_at DESC
    `;

    res.json({
      success: true,
      content: {
        ...application,
        activities
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update an application
export const updateApplication = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { id } = req.params;
    const updateData = req.body;

    const [application] = await sql`
      SELECT * FROM job_applications WHERE id = ${id}
    `;

    if (!application) {
      throw new NotFoundError('Job application');
    }

    if (application.user_id !== userId) {
      throw new ForbiddenError('You do not own this job application');
    }

    const previousStatus = application.status;
    const newStatus = updateData.status;

    if (newStatus) {
      validateStatus(newStatus);
    }

    // Prepare updated fields (default to existing if not provided)
    const company = updateData.company !== undefined ? updateData.company : application.company;
    const role = updateData.role !== undefined ? updateData.role : application.role;
    const jobUrl = updateData.jobUrl !== undefined ? updateData.jobUrl : application.job_url;
    const jobDescription = updateData.jobDescription !== undefined ? updateData.jobDescription : application.job_description;
    const location = updateData.location !== undefined ? updateData.location : application.location;
    const employmentType = updateData.employmentType !== undefined ? updateData.employmentType : application.employment_type;
    const appliedDate = updateData.appliedDate !== undefined ? updateData.appliedDate : application.applied_date;
    const status = newStatus !== undefined ? newStatus : application.status;
    const recruiterName = updateData.recruiterName !== undefined ? updateData.recruiterName : application.recruiter_name;
    const recruiterEmail = updateData.recruiterEmail !== undefined ? updateData.recruiterEmail : application.recruiter_email;
    const recruiterLinkedIn = updateData.recruiterLinkedIn !== undefined ? updateData.recruiterLinkedIn : application.recruiter_linkedin;
    const resumeReference = updateData.resumeReference !== undefined ? updateData.resumeReference : application.resume_reference;
    const notes = updateData.notes !== undefined ? updateData.notes : application.notes;
    const nextAction = updateData.nextAction !== undefined ? updateData.nextAction : application.next_action;
    const nextActionDate = updateData.nextActionDate !== undefined ? updateData.nextActionDate : application.next_action_date;

    const [updatedApplication] = await sql`
      UPDATE job_applications SET
        company = ${company},
        role = ${role},
        job_url = ${jobUrl},
        job_description = ${jobDescription},
        location = ${location},
        employment_type = ${employmentType},
        applied_date = ${appliedDate},
        status = ${status},
        recruiter_name = ${recruiterName},
        recruiter_email = ${recruiterEmail},
        recruiter_linkedin = ${recruiterLinkedIn},
        resume_reference = ${resumeReference},
        notes = ${notes},
        next_action = ${nextAction},
        next_action_date = ${nextActionDate},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    // Log STATUS_CHANGED if different
    if (newStatus && previousStatus !== newStatus) {
      await sql`
        INSERT INTO job_application_activities (
          application_id, user_id, type, previous_status, new_status, note
        ) VALUES (
          ${id}, ${userId}, 'STATUS_CHANGED', ${previousStatus}, ${newStatus}, ${`Status updated from ${previousStatus} to ${newStatus}`}
        )
      `;
    }

    // Invalidate caches
    await safeDel(`user:applications:${userId}`);

    res.json({ success: true, content: updatedApplication });
  } catch (error) {
    next(error);
  }
};

// Delete an application
export const deleteApplication = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { id } = req.params;

    const [application] = await sql`
      SELECT * FROM job_applications WHERE id = ${id}
    `;

    if (!application) {
      throw new NotFoundError('Job application');
    }

    if (application.user_id !== userId) {
      throw new ForbiddenError('You do not own this job application');
    }

    await sql`
      DELETE FROM job_applications WHERE id = ${id}
    `;

    // Invalidate caches
    await safeDel(`user:applications:${userId}`);

    res.json({ success: true, message: 'Job application deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Retrieve timeline activities paginated
export const getApplicationActivities = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { id } = req.params;
    const { page = 1, limit = 3 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 3;
    const offset = (pageNum - 1) * limitNum;

    const [application] = await sql`
      SELECT user_id FROM job_applications WHERE id = ${id}
    `;

    if (!application) {
      throw new NotFoundError('Job application');
    }

    if (application.user_id !== userId) {
      throw new ForbiddenError('You do not own this job application');
    }

    const items = await sql`
      SELECT * FROM job_application_activities 
      WHERE application_id = ${id} 
      ORDER BY created_at DESC 
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const countResult = await sql`
      SELECT COUNT(*) FROM job_application_activities WHERE application_id = ${id}
    `;

    const total = parseInt(countResult[0]?.count || '0', 10);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      items,
      page: pageNum,
      limit: limitNum,
      totalItems: total,
      totalPages
    });
  } catch (error) {
    next(error);
  }
};

// Retrieve upcoming actions
export const getUpcomingActions = async (req, res, next) => {
  try {
    const { userId } = req.auth();

    const items = await sql`
      SELECT * FROM job_applications
      WHERE user_id = ${userId}
        AND next_action_date >= CURRENT_DATE
      ORDER BY next_action_date ASC
    `;

    res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
};

// Retrieve deterministic analytics
export const getAnalytics = async (req, res, next) => {
  try {
    const { userId } = req.auth();

    const totalRes = await sql`
      SELECT COUNT(*)::integer as count FROM job_applications WHERE user_id = ${userId}
    `;
    const total = totalRes[0]?.count || 0;

    const statusCounts = await sql`
      SELECT status, COUNT(*)::integer as count 
      FROM job_applications 
      WHERE user_id = ${userId} 
      GROUP BY status
    `;

    const counts = {
      Saved: 0,
      Applied: 0,
      'Online Assessment': 0,
      Interview: 0,
      'Final Round': 0,
      Offer: 0,
      Rejected: 0,
      Withdrawn: 0
    };

    statusCounts.forEach(row => {
      if (counts[row.status] !== undefined) {
        counts[row.status] = row.count;
      }
    });

    const activeCount = counts.Applied + counts['Online Assessment'] + counts.Interview + counts['Final Round'];

    // Rates calculation logic:
    // Interview Rate: applications that reached Interview or later / total applications
    // Reach Interview or later = Interview + Final Round + Offer
    const reachedInterview = counts.Interview + counts['Final Round'] + counts.Offer;
    const interviewRate = total > 0 ? parseFloat((reachedInterview / total).toFixed(4)) : 0;

    // Offer Rate: Offer / total
    const offerRate = total > 0 ? parseFloat((counts.Offer / total).toFixed(4)) : 0;

    // Rejection Rate: Rejected / total
    const rejectionRate = total > 0 ? parseFloat((counts.Rejected / total).toFixed(4)) : 0;

    // Response Rate: status NOT IN (Saved, Applied) / total
    const responseCount = total - counts.Saved - counts.Applied;
    const responseRate = total > 0 ? parseFloat((responseCount / total).toFixed(4)) : 0;

    res.json({
      success: true,
      analytics: {
        totalApplications: total,
        activeApplications: activeCount,
        interviews: counts.Interview,
        finalRounds: counts['Final Round'],
        offers: counts.Offer,
        rejections: counts.Rejected,
        withdrawals: counts.Withdrawn,
        responseRate,
        interviewRate,
        offerRate,
        rejectionRate,
        statusDistribution: counts
      }
    });
  } catch (error) {
    next(error);
  }
};

// Queue request for AI job search insights
export const analyzeJobSearchInsights = async (req, res, next) => {
  try {
    const { userId } = req.auth();

    const countRes = await sql`
      SELECT COUNT(*)::integer as count FROM job_applications WHERE user_id = ${userId}
    `;
    const count = countRes[0]?.count || 0;

    if (count === 0) {
      throw new ValidationError('No historical data available. Please add some job applications first.');
    }

    if (count < 3) {
      return res.json({
        success: true,
        status: 'insufficient_data',
        message: 'Not enough historical data to identify reliable patterns. Please add at least 3 job applications.',
        dataQuality: {
          applicationCount: count,
          confidence: 'low',
          sufficientForPatterns: false
        }
      });
    }

    // Queue task
    const taskId = await addTask('job-search-insights', {
      type: 'job-search-insights',
      userId,
      plan: req.plan
    });

    res.status(202).json({
      success: true,
      taskId,
      status: 'queued'
    });
  } catch (error) {
    next(error);
  }
};

// Retrieve paginated insight history
export const getInsightHistory = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { page = 1, limit = 3 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 3;
    const offset = (pageNum - 1) * limitNum;

    const items = await sql`
      SELECT * FROM job_search_insights
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const countRes = await sql`
      SELECT COUNT(*) FROM job_search_insights WHERE user_id = ${userId}
    `;
    const total = parseInt(countRes[0]?.count || '0', 10);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      items,
      page: pageNum,
      limit: limitNum,
      totalItems: total,
      totalPages
    });
  } catch (error) {
    next(error);
  }
};

// Retrieve a single insight
export const getInsightDetail = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const { id } = req.params;

    const [insight] = await sql`
      SELECT * FROM job_search_insights WHERE id = ${id}
    `;

    if (!insight) {
      throw new NotFoundError('Job search insight');
    }

    if (insight.user_id !== userId) {
      throw new ForbiddenError('You do not own this job search insight');
    }

    res.json({ success: true, content: insight });
  } catch (error) {
    next(error);
  }
};

// Retrieve all activities across all applications for the current user
export const listAllActivities = async (req, res, next) => {
  try {
    const { userId } = req.auth();
    const activities = await sql`
      SELECT a.*, j.company, j.role 
      FROM job_application_activities a
      JOIN job_applications j ON a.application_id = j.id
      WHERE a.user_id = ${userId}
      ORDER BY a.created_at DESC
      LIMIT 100
    `;
    res.json({ success: true, content: activities });
  } catch (error) {
    next(error);
  }
};
