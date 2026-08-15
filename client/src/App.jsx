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
import { Toaster } from 'react-hot-toast';

const App = () => {
  return (
    <div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '10px',
            background: '#fff',
            color: '#0a0a0a',
            border: '1px solid #e5e5e5',
            boxShadow: '0 4px 20px -4px rgba(0,0,0,0.08)',
            fontSize: '14px',
            padding: '12px 16px',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route element={<Layout />}>
          <Route path="/linkedin-optimizer" element={<LinkedinOptimizer />} />
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
          {/* <Route path="community" element={<Community />} /> */}
        </Route>
      </Routes>
    </div>
  );
};

export default App;
