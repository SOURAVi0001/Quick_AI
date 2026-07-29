import { AiToolsData } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';

const AiTools = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  return (
    <div className="px-4 sm:px-20 xl:px-32 my-24">
      <div className="text-center">
        <h2 className="text-foreground text-[42px] font-semibold tracking-tight">
          Powerful AI Tools
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Everything you need to create, enhance, and optimize your content with cutting-edge AI
          technology.
        </p>
      </div>
      <div className="flex flex-wrap mt-10 justify-center gap-6">
        {AiToolsData.map((tool, index) => (
          <Card
            key={index}
            className="max-w-xs hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            onClick={() => user && navigate(tool.path)}
          >
            <CardHeader>
              <div className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center">
                <tool.Icon className="w-5 h-5 text-background" />
              </div>
              <CardTitle className="mt-4">{tool.title}</CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AiTools;
