import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { servicesAPI } from '@/lib/api';
import ServiceCard from '@/components/ServiceCard';
import { Activity, RefreshCw, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
    const navigate = useNavigate();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const fetchServices = async () => {
        try {
            const response = await servicesAPI.getAll();
            if (response.success) {
                setServices(response.data);
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    useEffect(() => {
        fetchServices();

        // Auto-refresh every 1 second (premium real-time updates)
        const interval = setInterval(fetchServices, 1000);

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 animate-spin text-neon-green mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading services...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-bg">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 animate-fade-in">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-green to-neon-cyan bg-clip-text text-transparent">
                            Smart Microservice Health Guardian
                        </h1>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Activity className="w-4 h-4 animate-pulse text-neon-green" />
                                <span>Live</span>
                            </div>
                            <Button
                                onClick={() => navigate('/settings')}
                                variant="outline"
                                size="sm"
                                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </Button>
                            <Button
                                onClick={handleLogout}
                                variant="outline"
                                size="sm"
                                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    </div>
                    <p className="text-muted-foreground">
                        AI-Enabled Monitoring Dashboard • Logged in as {user.email} • Last updated: {lastUpdate?.toLocaleTimeString()}
                    </p>
                </div>

                {/* Services Grid */}
                {services.length === 0 ? (
                    <div className="text-center py-12">
                        <Activity className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-xl text-muted-foreground">No services registered yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Start your microservices to see them here
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {services.map((service) => (
                            <ServiceCard key={service.id} service={service} />
                        ))}
                    </div>
                )}

                {/* Stats Footer */}
                <div className="mt-8 pt-6 border-t border-border">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <StatCard
                            label="Total Services"
                            value={services.length}
                            color="text-neon-cyan"
                        />
                        <StatCard
                            label="Healthy"
                            value={services.filter(s => s.status === 'healthy').length}
                            color="text-neon-green"
                        />
                        <StatCard
                            label="Analyzing"
                            value={services.filter(s => s.status === 'analyzing').length}
                            color="text-blue-400"
                        />
                        <StatCard
                            label="Warning"
                            value={services.filter(s => s.status === 'warning').length}
                            color="text-neon-yellow"
                        />
                        <StatCard
                            label="Critical"
                            value={services.filter(s => s.status === 'critical').length}
                            color="text-neon-red"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, color }) {
    return (
        <div className="bg-card rounded-lg p-4 border border-border">
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
    );
}
