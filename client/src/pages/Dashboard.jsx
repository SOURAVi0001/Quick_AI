import React, { useState, useEffect } from 'react' 
import { Sparkles ,Gem} from 'lucide-react';
import { dummyCreationData } from '../assets/assets'
import { Protect } from '@clerk/clerk-react';
import CreationItem from '../components/CreationItems';
import axios from 'axios'
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import Markdown from 'react-markdown';
axios.defaults.baseURL=import.meta.env.VITE_BASE_URL;

const Dashboard = () => {

  const [creations,setCreations]=useState([]);
   const [loading,setLoading]=useState(false);
    const [content,setContent]=useState('');
    const {getToken}=useAuth();

  const getDashboardData = async() =>{
    try {
      const {data} = await axios.get('/api/get-user-creations', {headers:{Authorization:`Bearer ${await getToken()}`}})
      if(data.success){
        setContent(data.content)
      }
      else{
        toast.error(data.message)
      }
  }catch(error){
toast.error(error.message);
  }
  setLoading(false);
}
  useEffect(()=>{
    getDashboardData();
  },[])

  return (
    <div className='h-full overflow-y-scroll p-6'>
      <div className='flex justify-start gap-4 flex-wrap'>
        <div className="flex justify-between items-center w-72 p-4 px-6 bg-white rounded-xl border border-gray-200">
          <div className='text-slate-600'>
            <p className='text-sm'>Total Creations</p>
            <h2 className='text-xl font-semibold'>{creations.length}</h2>
          </div>
          <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-[#3588F2] to-[#c306e9] text-white flex justify-center items-center'>
            <Sparkles className='w-5 text-white' />
          </div>
        </div>

        {/*Active plan name */}
        <div className="flex justify-between items-center w-72 p-4 px-6 bg-white rounded-xl border border-gray-200">
          <div className='text-slate-600'>
            <p className='text-sm'>Active Plan</p>
            <h2 className='text-xl font-semibold'>
              <Protect plan='premium' fallback='Free'>Premium </Protect>
            </h2>
          </div>
          <div className='w-10 h-10 rounded-lg bg-gradient-to-br from-[#d88d24] to-[#fffb00] text-white flex justify-center items-center'>
            <Gem className='w-5 text-white' />
          </div>
        </div>

        {/* */}
        {
          loading ?(
           <div className='flex justify-center items-center h-3/4'>
            <div className='animate-spin rounded-full h-11 w-11 border-3 border-purple-500 border-t-transparent'></div>
           </div>
          ):(
            <div className='space-y-3'>
          <p className='mt-6 mb-4'>Recent Creations</p>
          {
            creations.map((item)=><CreationItem key={item.id} item={item}/>)
          }
        </div>
          )
        }
        



      </div>

      </div>

  )
}
export default Dashboard