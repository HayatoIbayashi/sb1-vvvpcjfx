import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import PasswordResetPage from './components/PasswordResetPage';
import MovieDetailPage from './components/MovieDetailPage';
import MovieListPage from './components/MovieListPage';
import MoviePlayerPage from './components/MoviePlayerPage';
import MovieManagementPage from './components/admin/MovieManagementPage';
import AdminDashboard from './components/AdminDashboard';
import SubscriptionPage from './components/SubscriptionPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MovieListPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/password-reset" element={<PasswordResetPage />} />
        <Route path="/movies/:id" element={<MovieDetailPage />} />
        <Route path="/watch/:id" element={<MoviePlayerPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/movies" element={<MovieManagementPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
      </Routes>
    </Router>
  );
}

export default App;
