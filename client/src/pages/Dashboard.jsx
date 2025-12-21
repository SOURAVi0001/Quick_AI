import React, { useState, useEffect } from 'react'
import { Sparkles, Gem } from 'lucide-react';
import { Protect } from '@clerk/clerk-react';
import CreationItem from '../components/CreationItems';
import api from '../lib/api'
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

// baseURL handled by client/src/lib/api.js via VITE_SERVER_URL or VITE_BASE_URL

const Dashboard = () => {
  const [creations, setCreations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  const getDashboardData = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/user/get-user-creations', {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if (data.success) {
        setCreations(data.content)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getDashboardData();
  }, [])

  return (
    <div className='h-full overflow-y-scroll p-6 bg-gray-50'>
      {/* Stats Cards Row */}
      <div className='flex gap-4 mb-6'>
        {/* Total Creations Card */}
        <div className="flex justify-between items-center w-72 p-4 px-6 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className='text-slate-600'>
            <p className='text-sm font-medium'>Total Creations</p>
            <h2 className='text-2xl font-bold mt-1'>{creations.length}</h2>
          </div>
          <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-[#3588F2] to-[#c306e9] flex justify-center items-center'>
            <Sparkles className='w-6 text-white' />
          </div>
        </div>

        {/* Active Plan Card */}
        <div className="flex justify-between items-center w-72 p-4 px-6 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className='text-slate-600'>
            <p className='text-sm font-medium'>Active Plan</p>
            <h2 className='text-2xl font-bold mt-1'>
              <Protect plan='premium' fallback='Free'>
                Premium
              </Protect>
            </h2>
          </div>
          <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-[#d88d24] to-[#fffb00] flex justify-center items-center'>
            <Gem className='w-6 text-white' />
          </div>
        </div>
      </div>

      {/* Recent Creations Section */}
      <div className='w-full'>
        <h3 className='text-lg font-semibold text-slate-700 mb-4'>Recent Creations</h3>

        {loading ? (
          <div className='flex justify-center items-center py-20'>
            <div className='flex flex-col items-center gap-3'>
              <div className='animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent'></div>
              <p className='text-sm text-gray-500'>Loading your creations...</p>
            </div>
          </div>
        ) : creations.length === 0 ? (
          <div className='flex justify-center items-center py-20'>
            <div className='text-center text-gray-500'>
              <Sparkles className='w-12 h-12 mx-auto mb-3 text-gray-400' />
              <p className='text-lg font-medium'>No creations yet</p>
              <p className='text-sm mt-1'>Start creating content to see it here</p>
            </div>
          </div>
        ) : (
          <div className='space-y-3'>
            {creations.map((item) => (
              <CreationItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
