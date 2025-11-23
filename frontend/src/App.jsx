import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ServiceDetail from './pages/ServiceDetail';
import Login from './pages/Login';
import Settings from './pages/Settings';
import PrivateRoute from './components/PrivateRoute';
import './index.css';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                    path="/"
                    element={
                        <PrivateRoute>
                            <Dashboard />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/service/:id"
                    element={
                        <PrivateRoute>
                            <ServiceDetail />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <PrivateRoute>
                            <Settings />
                        </PrivateRoute>
                    }
                />
            </Routes>
        </Router>
    );
}

export default App;
