import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Gem } from 'lucide-react';
import { Protect, useAuth } from '@clerk/clerk-react';
import CreationItem from '../components/CreationItems';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';

const Dashboard = () => {
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  const getDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/user/get-user-creations', {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (data.success) {
        setCreations(data.content);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    getDashboardData();
  }, [getDashboardData]);

  return (
    <div className="h-full overflow-y-scroll p-6">
      <div className="flex gap-4 mb-6">
        <Card className="w-64">
          <CardContent className="flex justify-between items-center p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total Creations</p>
              <h2 className="text-2xl font-bold mt-1 text-foreground">{creations.length}</h2>
            </div>
            <div className="w-11 h-11 rounded-xl bg-foreground flex items-center justify-center">
              <Sparkles className="w-5 text-background" />
            </div>
          </CardContent>
        </Card>
        <Card className="w-64">
          <CardContent className="flex justify-between items-center p-5">
            <div>
              <p className="text-sm text-muted-foreground">Active Plan</p>
              <h2 className="text-2xl font-bold mt-1 text-foreground">
                <Protect plan="premium" fallback="Free">
                  Premium
                </Protect>
              </h2>
            </div>
            <div className="w-11 h-11 rounded-xl bg-muted-foreground/20 flex items-center justify-center">
              <Gem className="w-5 text-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Creations</h3>
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <p className="text-sm text-muted-foreground">Loading your creations...</p>
            </div>
          </div>
        ) : creations.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-lg font-medium text-foreground">No creations yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start creating content to see it here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {creations.map((item) => (
              <CreationItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
