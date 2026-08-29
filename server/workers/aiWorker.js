import { handleEmailTask } from './handlers/emailHandler.js';
import { handleResumeTask } from './handlers/resumeHandler.js';
import { handleLinkedinTask } from './handlers/linkedinHandler.js';
import { handleOutreachTask } from './handlers/outreachHandler.js';
import { handleInterviewTask } from './handlers/interviewHandler.js';
import { handleImageTask } from './handlers/imageHandler.js';
import { handleInsightsTask } from './handlers/insightsHandler.js';

/**
 * Main worker dispatcher function to process various background AI tasks.
 * @param {object} job - The BullMQ job object containing task details
 * @returns {Promise<object>} The task result object
 */
export async function processAITask(job) {
  const { type } = job.data;

  switch (type) {
    case 'generate-email':
    case 'generate-blog-title':
      return handleEmailTask(job);

    case 'resume-review':
    case 'resume-tailor':
      return handleResumeTask(job);

    case 'linkedin-optimizer':
      return handleLinkedinTask(job);

    case 'recruiter-outreach':
      return handleOutreachTask(job);

    case 'interview-start':
    case 'interview-answer':
    case 'interview-all-answers':
      return handleInterviewTask(job);

    case 'generate-image':
    case 'remove-image-object':
    case 'remove-image-background':
      return handleImageTask(job);

    case 'job-search-insights':
      return handleInsightsTask(job);

    default:
      throw new Error(`Unknown task type: ${type}`);
  }
}
