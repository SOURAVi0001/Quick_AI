import { useUser } from '@clerk/clerk-react';
import { AiToolsData } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 sm:p-8">
        <div className="mb-10">
          <p className="text-[11px] font-semibold text-[#555] tracking-[0.2em] uppercase mb-2">
            Overview
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            {user?.firstName || 'Dashboard'}
          </h1>
          <p className="mt-2 text-sm text-[#666] max-w-lg">
            Select a tool below to start creating.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-[#222]">
          {AiToolsData.map((tool, index) => (
            <button
              key={index}
              onClick={() => navigate(tool.path)}
              className="group border-r border-b border-[#222] p-6 sm:p-8 text-left hover:bg-[#0a0a0a] transition-colors duration-200"
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="w-9 h-9 border border-[#333] bg-[#0a0a0a] flex items-center justify-center group-hover:border-[#555] transition-colors">
                  <tool.Icon className="w-4 h-4 text-white" />
                </div>
                <ArrowRight className="w-4 h-4 text-[#333] group-hover:text-[#666] transition-colors ml-auto shrink-0" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2 leading-snug">
                {tool.title}
              </h3>
              <p className="text-sm text-[#555] leading-relaxed">{tool.description}</p>
            </button>
          ))}
        </div>

        <div className="mt-8 border border-[#222] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Not sure where to start?
            </h3>
            <p className="text-xs text-[#555] mt-1">
              Let us pick a random tool for you.
            </p>
          </div>
          <button
            onClick={() => {
              const randomTool = AiToolsData[Math.floor(Math.random() * AiToolsData.length)];
              navigate(randomTool.path);
            }}
            className="px-5 py-2.5 text-[11px] font-semibold bg-white text-black border border-white hover:bg-[#ddd] transition-colors uppercase tracking-wider"
          >
            Pick random tool
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
