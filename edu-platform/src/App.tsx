import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { RequireAuth } from "@/components/RequireAuth";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/app/Dashboard";
import Catalog from "@/pages/app/Catalog";
import CourseDetail from "@/pages/app/CourseDetail";
import Learn from "@/pages/app/Learn";
import Progress from "@/pages/app/Progress";
import Recommendations from "@/pages/app/Recommendations";
import Community from "@/pages/app/Community";
import Challenges from "@/pages/app/Challenges";
import Profile from "@/pages/app/Profile";
import Admin from "@/pages/app/Admin";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
        </Route>

        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <PublicLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Onboarding />} />
        </Route>

        <Route
          path="/app"
          element={
            <RequireAuth>
              <ProtectedLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="catalog" element={<Catalog />} />
          <Route path="courses/:courseId" element={<CourseDetail />} />
          <Route path="learn/:lessonId" element={<Learn />} />
          <Route path="progress" element={<Progress />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="community" element={<Community />} />
          <Route path="community/challenges" element={<Challenges />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admin" element={<Admin />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
