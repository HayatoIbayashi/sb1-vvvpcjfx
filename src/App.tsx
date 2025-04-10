import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';
import PasswordResetPage from './components/PasswordResetPage';
import MovieDetailPage from './components/MovieDetailPage';
import MovieListPage from './components/MovieListPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MovieListPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/password-reset" element={<PasswordResetPage />} />
        <Route path="/movies/:id" element={<MovieDetailPage />} />
      </Routes>
    </Router>
  );
}

export default App;