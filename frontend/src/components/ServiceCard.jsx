import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import StatusBadge from './StatusBadge';
import { Badge } from './ui/badge';
import { formatTimestamp, getStatusGlow, cn } from '@/lib/utils';
import { Activity, Clock, AlertTriangle, Zap } from 'lucide-react';

export default function ServiceCard({ service }) {
    const navigate = useNavigate();
    const [timeLeft, setTimeLeft] = useState(null);
    const timerInitialized = useRef(false);

    // Initialize timer when analyzing status starts
    useEffect(() => {
        if (service.status === 'analyzing') {
            // Only set timer once per analyzing session
            if (!timerInitialized.current && service.metrics?.analyzingProgress?.secondsRemaining !== undefined) {
                setTimeLeft(service.metrics.analyzingProgress.secondsRemaining);
                timerInitialized.current = true;
            }
        } else {
            // Clear timer and reset flag when status changes away from analyzing
            setTimeLeft(null);
            timerInitialized.current = false;
        }
    }, [service.status, service.metrics?.analyzingProgress?.secondsRemaining]);

    // Client-side countdown
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    const handleClick = () => {
        navigate(`/service/${service.id}`);
    };

    const glowClass = getStatusGlow(service.status);

    return (
        <Card
            onClick={handleClick}
            className={cn(
                "cursor-pointer hover:scale-105 transition-all duration-300 animate-fade-in",
                glowClass
            )}
        >
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold">
                        {service.name}
                    </CardTitle>
                    <StatusBadge status={service.status} />
                </div>
                {service.isAtRisk && (
                    <Badge variant="warning" className="mt-2 w-fit">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        At Risk
                    </Badge>
                )}
                {service.autoHealingInProgress && (
                    <Badge variant="healthy" className="mt-2 w-fit animate-pulse-glow">
                        <Zap className="w-3 h-3 mr-1" />
                        Auto-healing...
                    </Badge>
                )}
                {service.status === 'analyzing' && (
                    <Badge variant="secondary" className="mt-2 w-fit animate-pulse">
                        <Clock className="w-3 h-3 mr-1" />
                        Analyzing... {timeLeft !== null ? `${timeLeft}s remaining` : 'Calculating...'}
                    </Badge>
                )}
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <MetricItem
                        icon={<Activity className="w-4 h-4" />}
                        label="Latency"
                        value={`${service.metrics?.avgLatency || 0}ms`}
                    />
                    <MetricItem
                        icon={<AlertTriangle className="w-4 h-4" />}
                        label="Error Rate"
                        value={`${service.metrics?.errorRate?.toFixed(2) || 0}%`}
                    />
                    <MetricItem
                        icon={<Clock className="w-4 h-4" />}
                        label="Last Heartbeat"
                        value={formatTimestamp(service.lastHeartbeat)}
                    />
                    <MetricItem
                        icon={<Zap className="w-4 h-4" />}
                        label="Memory"
                        value={`${service.metrics?.memoryUsage || 0}MB`}
                    />
                </div>
                <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                        Port: {service.port} • {service.url}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function MetricItem({ icon, label, value }) {
    return (
        <div className="flex items-start space-x-2">
            <div className="text-muted-foreground mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold truncate">{value}</p>
            </div>
        </div>
    );
}
