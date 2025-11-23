import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function Settings() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        // Clear errors when typing
        if (error) setError(null);
        if (success) setSuccess(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (formData.newPassword !== formData.confirmPassword) {
            setError("New passwords don't match");
            setLoading(false);
            return;
        }

        if (formData.newPassword.length < 6) {
            setError("New password must be at least 6 characters");
            setLoading(false);
            return;
        }

        try {
            const response = await authAPI.changePassword(
                formData.currentPassword,
                formData.newPassword
            );

            if (response.success) {
                setSuccess('Password updated successfully');
                setFormData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
            } else {
                setError(response.message || 'Failed to update password');
            }
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen gradient-bg p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center space-x-4 mb-8">
                    <Button
                        variant="ghost"
                        className="text-muted-foreground hover:text-white"
                        onClick={() => navigate('/')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </div>

                <Card className="glass-card border-white/10">
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <Lock className="w-5 h-5 text-neon-blue" />
                            <CardTitle className="text-xl text-white">Security Settings</CardTitle>
                        </div>
                        <CardDescription className="text-gray-400">
                            Manage your account security and password
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center text-red-400 text-sm">
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center text-green-400 text-sm">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    {success}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Current Password</label>
                                <Input
                                    type="password"
                                    name="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={handleChange}
                                    className="bg-black/20 border-white/10 text-white focus:border-neon-blue"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">New Password</label>
                                <Input
                                    type="password"
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    className="bg-black/20 border-white/10 text-white focus:border-neon-blue"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Confirm New Password</label>
                                <Input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="bg-black/20 border-white/10 text-white focus:border-neon-blue"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-neon-blue hover:bg-blue-600 text-white mt-4"
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                        Updating...
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        <Save className="w-4 h-4 mr-2" />
                                        Update Password
                                    </span>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
