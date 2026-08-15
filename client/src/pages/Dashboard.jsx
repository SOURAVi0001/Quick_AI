import { useUser } from '@clerk/clerk-react';
import { AiToolsData } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import HistorySection from '../components/HistorySection';
import { Card, CardContent } from '../components/ui/Card';

const Dashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  return (
    <div className="h-full overflow-y-auto pb-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <p className="text-xs font-semibold text-accent tracking-[0.2em] uppercase mb-2">
            Overview
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.firstName || 'User'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg">
            What are you working on today? Select a tool to start creating.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {AiToolsData.map((tool, index) => (
            <Card
              key={index}
              className="group cursor-pointer hover:border-accent/40 hover:shadow-md transition-all duration-300"
              onClick={() => navigate(tool.path)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-10 h-10 rounded-lg border border-border/50 bg-accent/5 flex items-center justify-center group-hover:bg-accent/10 group-hover:border-accent/30 transition-colors">
                    <tool.Icon className="w-5 h-5 text-accent" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors ml-auto shrink-0" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1 leading-snug">
                  {tool.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {tool.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <HistorySection 
          title="Recent Activity" 
          renderItem={(item, { format }) => (
            <div className="p-5 flex items-start gap-4">
              <div className="p-2 rounded bg-muted/30">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-medium text-foreground capitalize">
                    {item.type.replace('-', ' ')}
                  </h4>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(item.created_at)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {typeof item.content === 'string' ? item.content : JSON.stringify(item.content)}
                </p>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default Dashboard;
