import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { servicesAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ArrowLeft, Activity, TrendingUp, AlertTriangle, Clock, Zap } from 'lucide-react';
import { formatTimestamp, getTrendIcon } from '@/lib/utils';

export default function ServiceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('15m');

    const fetchServiceHistory = async () => {
        try {
            const response = await servicesAPI.getHistory(id, timeRange);
            if (response.success) {
                setData(response.data);
            }
        } catch (error) {
            console.error('Error fetching service history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServiceHistory();

        // Auto-refresh every 3 seconds (premium real-time charts)
        const interval = setInterval(fetchServiceHistory, 3000);

        return () => clearInterval(interval);
    }, [id, timeRange]);

    if (loading) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center">
                <div className="text-center">
                    <Activity className="w-12 h-12 animate-spin text-neon-green mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading service details...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-neon-red mx-auto mb-4" />
                    <p className="text-xl text-foreground mb-2">Service not found</p>
                    <button
                        onClick={() => navigate('/')}
                        className="text-neon-cyan hover:underline"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const { service, metrics, events, baseline } = data;

    // Use backend-calculated trend (Linear Regression)
    const latencyTrend = service.currentMetrics?.trend || 'stable';

    return (
        <div className="min-h-screen gradient-bg">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 animate-fade-in">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </button>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">{service.name}</h1>
                            <div className="flex items-center space-x-3">
                                <StatusBadge status={service.status} />
                                {latencyTrend !== 'stable' && (
                                    <Badge variant="outline" className="text-sm">
                                        <TrendingUp className="w-3 h-3 mr-1" />
                                        Trend: {getTrendIcon(latencyTrend)} {latencyTrend}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            {['15m', '30m', '1h', '6h', '24h'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-3 py-1 rounded text-sm transition-colors ${timeRange === range
                                        ? 'bg-neon-green text-black font-semibold'
                                        : 'bg-card text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Current Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <MetricCard
                        icon={<Activity className="w-5 h-5" />}
                        label="Avg Latency"
                        value={`${service.currentMetrics?.avgLatency || 0}ms`}
                        baseline={baseline ? `Baseline: ${baseline.avgLatency.toFixed(0)}ms` : null}
                    />
                    <MetricCard
                        icon={<AlertTriangle className="w-5 h-5" />}
                        label="Error Rate"
                        value={`${service.currentMetrics?.errorRate?.toFixed(2) || 0}%`}
                        baseline={baseline ? `Baseline: ${baseline.avgErrorRate.toFixed(2)}%` : null}
                    />
                    <MetricCard
                        icon={<Zap className="w-5 h-5" />}
                        label="Memory Usage"
                        value={`${service.currentMetrics?.memoryUsage || 0}MB`}
                    />
                    <MetricCard
                        icon={<Clock className="w-5 h-5" />}
                        label="Total Requests"
                        value={service.currentMetrics?.totalRequests || 0}
                    />
                    <MetricCard
                        icon={<Activity className="w-5 h-5" />}
                        label="Requests/min"
                        value={service.currentMetrics?.requestCount || 0}
                    />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Latency Chart */}
                    <Card className="animate-fade-in">
                        <CardHeader>
                            <CardTitle className="text-lg">Latency Over Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={metrics}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 3.7% 15.9%)" />
                                    <XAxis
                                        dataKey="timestamp"
                                        tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
                                        stroke="hsl(240 5% 64.9%)"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <YAxis
                                        stroke="hsl(240 5% 64.9%)"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(240 10% 3.9%)',
                                            border: '1px solid hsl(240 3.7% 15.9%)',
                                            borderRadius: '8px',
                                        }}
                                        labelFormatter={(ts) => new Date(ts).toLocaleString()}
                                    />
                                    <Legend />
                                    {baseline && (
                                        <ReferenceLine
                                            y={baseline.avgLatency}
                                            stroke="hsl(142.1 76.2% 36.3%)"
                                            strokeDasharray="5 5"
                                            label={{ value: 'Baseline', fill: 'hsl(142.1 76.2% 36.3%)', fontSize: 12 }}
                                        />
                                    )}
                                    <Line
                                        type="monotone"
                                        dataKey="latency"
                                        stroke="hsl(189 94% 43%)"
                                        strokeWidth={2}
                                        dot={false}
                                        name="Latency (ms)"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Error Rate Chart */}
                    <Card className="animate-fade-in">
                        <CardHeader>
                            <CardTitle className="text-lg">Error Rate Over Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={metrics}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 3.7% 15.9%)" />
                                    <XAxis
                                        dataKey="timestamp"
                                        tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
                                        stroke="hsl(240 5% 64.9%)"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <YAxis
                                        stroke="hsl(240 5% 64.9%)"
                                        style={{ fontSize: '12px' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(240 10% 3.9%)',
                                            border: '1px solid hsl(240 3.7% 15.9%)',
                                            borderRadius: '8px',
                                        }}
                                        labelFormatter={(ts) => new Date(ts).toLocaleString()}
                                    />
                                    <Legend />
                                    {baseline && (
                                        <ReferenceLine
                                            y={baseline.avgErrorRate}
                                            stroke="hsl(142.1 76.2% 36.3%)"
                                            strokeDasharray="5 5"
                                            label={{ value: 'Baseline', fill: 'hsl(142.1 76.2% 36.3%)', fontSize: 12 }}
                                        />
                                    )}
                                    <Line
                                        type="monotone"
                                        dataKey="errorRate"
                                        stroke="hsl(0 84% 60%)"
                                        strokeWidth={2}
                                        dot={false}
                                        name="Error Rate (%)"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Events Timeline */}
                <Card className="animate-fade-in">
                    <CardHeader>
                        <CardTitle className="text-lg">Event Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {events.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">No events recorded</p>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {events.map((event) => (
                                    <EventItem key={event.id} event={event} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function MetricCard({ icon, label, value, baseline }) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                    <div className="text-neon-cyan">{icon}</div>
                    <div className="flex-1">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-2xl font-bold">{value}</p>
                        {baseline && (
                            <p className="text-xs text-muted-foreground mt-1">{baseline}</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function EventItem({ event }) {
    const severityColors = {
        info: 'border-neon-cyan',
        warning: 'border-neon-yellow',
        critical: 'border-neon-red',
    };

    const severityIcons = {
        info: 'ℹ️',
        warning: '⚠️',
        critical: '🔴',
    };

    return (
        <div className={`border-l-4 ${severityColors[event.severity]} pl-4 py-2`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium">
                        {severityIcons[event.severity]} {event.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {formatTimestamp(event.timestamp)}
                    </p>
                </div>
                <Badge variant="outline" className="text-xs">
                    {event.type}
                </Badge>
            </div>
        </div>
    );
}

function calculateTrend(values) {
    if (values.length < 3) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (percentChange > 15) return 'rising';
    if (percentChange < -15) return 'falling';
    return 'stable';
}
