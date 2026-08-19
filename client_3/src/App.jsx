import { Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import WriteEmail from './pages/WriteEmail';
import BlogTitles from './pages/BlogTitles';
import Layout from './pages/Layout';
import Community from './pages/Community';
import ReviewResume from './pages/ReviewResume';
import RemoveObject from './pages/RemoveObject';
import GenerateImages from './pages/GenerateImages';
import RemoveBackground from './pages/RemoveBackground';
import ResumeTailor from './pages/ResumeTailor';
import LinkedinOptimizer from './pages/LinkedinOptimizer';
import CareerScore from './pages/CareerScore';
import InterviewCoach from './pages/InterviewCoach';
import RecruiterOutreach from './pages/RecruiterOutreach';
import JobTracker from './pages/JobTracker';
import { Toaster } from 'react-hot-toast';

const App = () => {
  return (
    <div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            background: 'hsl(240 6% 13%)',
            color: 'hsl(0 0% 98%)',
            border: '1px solid hsl(240 5% 22%)',
            boxShadow: '0 8px 32px -12px rgb(0 0 0 / 0.7)',
            fontSize: '14px',
            padding: '12px 16px',
            maxWidth: '380px',
          },
          success: { iconTheme: { primary: 'hsl(152 60% 45%)', secondary: 'hsl(240 6% 13%)' } },
          error: { iconTheme: { primary: 'hsl(0 72% 56%)', secondary: 'hsl(240 6% 13%)' } },
        }}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route element={<Layout />}>
          <Route path="/linkedin-optimizer" element={<LinkedinOptimizer />} />
          <Route path="/job-tracker" element={<JobTracker />} />
        </Route>
        <Route path="/ai" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="write-email" element={<WriteEmail />} />
          {/* <Route path="blog-titles" element={<BlogTitles />} /> */}
          {/* <Route path="generate-images" element={<GenerateImages />} /> */}
          {/* <Route path="remove-background" element={<RemoveBackground />} /> */}
          {/* <Route path="remove-object" element={<RemoveObject />} /> */}
          <Route path="review-resume" element={<ReviewResume />} />
          <Route path="resume-tailor" element={<ResumeTailor />} />
          <Route path="linkedin-optimizer" element={<LinkedinOptimizer />} />
          <Route path="interview-coach" element={<InterviewCoach />} />
          <Route path="recruiter-outreach" element={<RecruiterOutreach />} />
          <Route path="career-score" element={<CareerScore />} />
          <Route path="job-tracker" element={<JobTracker />} />
          {/* <Route path="community" element={<Community />} /> */}
        </Route>
      </Routes>
    </div>
  );
};

export default App;
