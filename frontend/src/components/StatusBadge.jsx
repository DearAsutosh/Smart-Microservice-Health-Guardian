import { Badge } from './ui/badge';
import { getStatusIcon } from '@/lib/utils';

export default function StatusBadge({ status }) {
    const variantMap = {
        healthy: 'healthy',
        warning: 'warning',
        critical: 'critical',
        analyzing: 'secondary',
        unknown: 'outline'
    };

    const variant = variantMap[status] || 'outline';
    const icon = getStatusIcon(status);

    return (
        <Badge variant={variant} className="text-sm font-medium">
            <span className="mr-1">{icon}</span>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
    );
}
