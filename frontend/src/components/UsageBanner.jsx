
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, AlertCircle } from 'lucide-react';
import axios from 'axios';

const UsageBanner = () => {
    const [status, setStatus] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');

    const { user } = useAuth();

    const fetchStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.get('/api/usage-status', { headers });
            setStatus(res.data);
        } catch (e) {
            console.error("Failed to fetch usage status", e);
        }
    };

    useEffect(() => {
        // Optimization: Use cached data if available
        if (user && user.usageToday !== undefined) {
            setStatus({
                usage: user.usageToday,
                limit: user.limit || 300,
                resetTime: user.resetTime
            });
        } else {
            fetchStatus();
        }
        window.addEventListener('usage-updated', fetchStatus); // Listen for custom event from tools
        
        // Refresh periodically 
        const interval = setInterval(fetchStatus, 30000); 
        return () => {
            window.removeEventListener('usage-updated', fetchStatus);
            clearInterval(interval);
        };
    }, [user]);

    // Countdown Timer Logic
    useEffect(() => {
        if (!status || !status.resetTime) return;

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const reset = new Date(status.resetTime).getTime();
            const distance = reset - now;

            if (distance < 0) {
                setTimeLeft("Ready now");
                fetchStatus(); // Refresh to see if reset happened
            } else {
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000); // Optional?
                setTimeLeft(`${hours}h ${minutes}m`);
            }
        }, 60000); // Update every minute to save resources

        // Initial set
        const now = new Date().getTime();
        const reset = new Date(status.resetTime).getTime();
        const distance = reset - now;
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}m`);

        return () => clearInterval(timer);
    }, [status]);

    if (!status || status.usage === 0) return null;

    const remaining = Math.max(0, status.limit - status.usage);
    const isLimitReached = remaining === 0;

    return (
        <div className={`w-full py-3 px-4 flex items-center justify-center gap-4 text-sm font-medium transition-colors ${
            isLimitReached ? 'bg-marvel-red text-white' : 'bg-gray-100 text-gray-600'
        }`}>
            {isLimitReached ? (
                <>
                    <AlertCircle size={18} />
                    <span>Daily limit reached. Resets in {timeLeft}</span>
                </>
            ) : (
                <>
                    <Clock size={18} className="text-marvel-red" />
                    <span>
                        <span className="font-bold text-marvel-black">{remaining}</span> free tasks remaining today. 
                        {status.resetTime && <span className="opacity-75 ml-1"> (Resets in {timeLeft})</span>}
                    </span>
                </>
            )}
        </div>
    );
};

export default UsageBanner;
