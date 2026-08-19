import 'dotenv/config';
import { getDB } from '../configs/db.js';

async function migrate() {
  console.log('🔧 Running database migrations...\n');

  const sql = getDB();

  const migrations = [
    {
      name: 'idx_creations_user_date',
      description: 'Composite index for dashboard: fast user creation lookups sorted by date',
    },
    {
      name: 'idx_creations_publish',
      description: 'Partial index for community page: only indexes published creations',
    },
    {
      name: 'idx_creations_type',
      description: 'Index for filtering by creation type (article, image, etc.)',
    }
  ];

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_creations_user_date ON creations (user_id, created_at DESC)`;
    console.log(`  ✅ ${migrations[0].name}: ${migrations[0].description}`);
  } catch (err) {
    console.error(`  ❌ ${migrations[0].name}: ${err.message}`);
  }

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_creations_publish ON creations (publish) WHERE publish = true`;
    console.log(`  ✅ ${migrations[1].name}: ${migrations[1].description}`);
  } catch (err) {
    console.error(`  ❌ ${migrations[1].name}: ${err.message}`);
  }

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_creations_type ON creations (type)`;
    console.log(`  ✅ ${migrations[2].name}: ${migrations[2].description}`);
  } catch (err) {
    console.error(`  ❌ ${migrations[2].name}: ${err.message}`);
  }

  // --- Job Application Tracker Tables ---
  console.log('\n📦 Creating Job Application Tracker tables...');

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS job_applications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        job_url TEXT,
        job_description TEXT,
        location VARCHAR(255),
        employment_type VARCHAR(100),
        applied_date DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'Saved',
        recruiter_name VARCHAR(255),
        recruiter_email VARCHAR(255),
        recruiter_linkedin VARCHAR(255),
        resume_reference TEXT,
        notes TEXT,
        next_action VARCHAR(255),
        next_action_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('  ✅ Table job_applications created or already exists');
  } catch (err) {
    console.error('  ❌ Table job_applications failed:', err.message);
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS job_application_activities (
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        previous_status VARCHAR(50),
        new_status VARCHAR(50),
        note TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('  ✅ Table job_application_activities created or already exists');
  } catch (err) {
    console.error('  ❌ Table job_application_activities failed:', err.message);
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS job_search_insights (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        summary TEXT,
        analysis_json JSONB,
        data_quality JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('  ✅ Table job_search_insights created or already exists');
  } catch (err) {
    console.error('  ❌ Table job_search_insights failed:', err.message);
  }

  // --- Indexes for Job Application Tracker ---
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_job_application_activities_app ON job_application_activities (application_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_job_application_activities_user ON job_application_activities (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_job_search_insights_user_id ON job_search_insights (user_id)`;
    console.log('  ✅ Job tracker indexes created or already exist');
  } catch (err) {
    console.error('  ❌ Job tracker indexes creation failed:', err.message);
  }

  console.log('\n🎉 Migrations complete.');
  process.exit(0);
}

migrate();
