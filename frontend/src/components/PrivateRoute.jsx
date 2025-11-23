import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');

    if (!token) {
        // Redirect to login if no token
        return <Navigate to="/login" replace />;
    }

    // Render children if authenticated
    return children;
};

export default PrivateRoute;
