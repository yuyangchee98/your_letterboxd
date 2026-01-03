import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Films from './pages/Films';
import FilmDetail from './pages/FilmDetail';
import Diary from './pages/Diary';
import Watchlist from './pages/Watchlist';
import Reviews from './pages/Reviews';
import Profile from './pages/Profile';
import Insights from './pages/Insights';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="films" element={<Films />} />
          <Route path="films/:id" element={<FilmDetail />} />
          <Route path="diary" element={<Diary />} />
          <Route path="watchlist" element={<Watchlist />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="insights" element={<Insights />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
