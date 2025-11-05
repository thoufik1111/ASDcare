import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Download, Phone, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ScoringResult, getScheduleComplexity } from '@/utils/scoring';
import { ParentMetadata } from '@/data/questionBanks';
import jsPDF from 'jspdf';
import TaskCard, { TaskTheme } from './TaskCard';
import MoodCheck from './MoodCheck';
import AccessibilityControls from './AccessibilityControls';
import { useProgressTracking } from '@/hooks/useProgressTracking';
import { useEffect } from 'react';

interface DashboardProps {
  role: 'individual' | 'parent' | 'clinician';
  result: ScoringResult;
  metadata?: ParentMetadata;
  onNavigateToCalmZone: () => void;
}

export default function Dashboard({ role, result, metadata, onNavigateToCalmZone }: DashboardProps) {
  const schedule = getScheduleComplexity(result.severity);
  const { addEntry, getRecentEntries, getTrend } = useProgressTracking();
  
  const severityColors = {
    low: 'mint',
    mild: 'bright-blue',
    moderate: 'lavender',
    high: 'coral',
  };

  const accentColor = severityColors[result.severity];

  const tasks = generateTasks(result.severity, schedule.taskCount);
  const recentHistory = getRecentEntries(3);
  const trend = getTrend();

  useEffect(() => {
    addEntry(result, role);
  }, []);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('AutiCare Assessment Summary', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Assessment Score: ${result.normalizedScore}`, 20, 40);
    doc.text(`Severity Level: ${result.severityLabel}`, 20, 50);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 60);
    
    doc.text('Top Contributing Factors:', 20, 80);
    result.topContributors.forEach((contrib, index) => {
      doc.text(`${index + 1}. ${contrib.question}`, 20, 90 + (index * 10));
    });
    
    doc.text('Recommended Next Steps:', 20, 130);
    const recommendations = getRecommendations(result.severity);
    recommendations.forEach((rec, index) => {
      doc.text(`- ${rec}`, 20, 140 + (index * 10));
    });
    
    if (metadata) {
      doc.text(`Child Name: ${metadata.childName}`, 20, 180);
      doc.text(`Age: ${metadata.childAge}`, 20, 190);
    }
    
    doc.text(`Consent timestamp: ${new Date().toISOString()}`, 20, 210);
    
    doc.save('auticare-assessment-summary.pdf');
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <AccessibilityControls />
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              {role === 'individual' && 'My Dashboard'}
              {role === 'parent' && `${metadata?.childName}'s Dashboard`}
              {role === 'clinician' && 'Clinical Dashboard'}
            </h1>
            <p className="text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" />
              Download Summary
            </Button>
            {result.severity === 'high' && (
              <Button className="bg-coral hover:bg-coral/90">
                <Phone className="w-4 h-4 mr-2" />
                Contact Clinician
              </Button>
            )}
          </div>
        </div>

        {/* Score Summary Card */}
        <Card className={`border-2 border-${accentColor}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Assessment</CardTitle>
                <CardDescription>Based on your recent evaluation</CardDescription>
              </div>
              <div className={`text-5xl font-bold text-${accentColor}`}>
                {result.normalizedScore}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Badge className={`bg-${accentColor} text-${accentColor}-foreground text-lg px-4 py-2`}>
              {result.severityLabel}
            </Badge>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Today's Schedule
                  </CardTitle>
                  <CardDescription>
                    {schedule.description}
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {schedule.level} Complexity
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.map((task, index) => (
                <TaskCard
                  key={index}
                  title={task.title}
                  description={task.description}
                  duration={task.duration}
                  completed={task.completed}
                  theme={task.theme}
                  parentTip={task.parentTip}
                  accentColor={accentColor}
                  showParentTip={role === 'parent'}
                />
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-6">
            <MoodCheck result={result} />

            <Card className={`bg-${accentColor}/10 border-${accentColor}`}>
              <CardHeader>
                <CardTitle>Calm Zone</CardTitle>
                <CardDescription>
                  Take a mindful break
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className={`w-full bg-${accentColor}`}
                  onClick={onNavigateToCalmZone}
                >
                  Enter Calm Zone
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Progress Tracking
                  {trend === 'improving' && <TrendingUp className="w-4 h-4 text-mint" />}
                  {trend === 'declining' && <TrendingDown className="w-4 h-4 text-coral" />}
                  {trend === 'stable' && <Minus className="w-4 h-4 text-bright-blue" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Tasks Completed</span>
                    <span>2/{tasks.length}</span>
                  </div>
                  <Progress value={(2 / tasks.length) * 100} className="h-2" />
                </div>
                
                {recentHistory.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium mb-2">Recent Assessments</p>
                    <div className="space-y-1">
                      {recentHistory.map((entry, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{entry.date}</span>
                          <span className="font-medium">{entry.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateTasks(severity: ScoringResult['severity'], count: number) {
  const taskPool: Array<{
    title: string;
    description: string;
    duration: string;
    parentTip: string;
    completed: boolean;
    theme: TaskTheme;
  }> = [
    {
      title: 'Morning Routine',
      description: 'Complete morning self-care activities',
      duration: '15 min',
      parentTip: 'Use visual schedule cards to help guide each step',
      completed: true,
      theme: 'morning',
    },
    {
      title: 'Sensory Break',
      description: 'Take a calming sensory break',
      duration: '10 min',
      parentTip: 'Offer fidget toys or weighted blanket',
      completed: true,
      theme: 'morning',
    },
    {
      title: 'Learning Activity',
      description: 'Engage in structured learning',
      duration: severity === 'high' ? '8 min' : '20 min',
      parentTip: 'Break into 2-minute segments with rewards',
      completed: false,
      theme: 'afternoon',
    },
    {
      title: 'Lunch & Nutrition',
      description: 'Healthy meal time',
      duration: '30 min',
      parentTip: 'Introduce new foods gradually',
      completed: false,
      theme: 'afternoon',
    },
    {
      title: 'Social Interaction',
      description: 'Practice social skills',
      duration: '12 min',
      parentTip: 'Start with one-on-one interaction',
      completed: false,
      theme: 'afternoon',
    },
    {
      title: 'Physical Activity',
      description: 'Movement and exercise',
      duration: '15 min',
      parentTip: 'Allow for breaks and water as needed',
      completed: false,
      theme: 'evening',
    },
    {
      title: 'Nature Time',
      description: 'Outdoor relaxation',
      duration: '20 min',
      parentTip: 'Let them explore at their own pace',
      completed: false,
      theme: 'evening',
    },
    {
      title: 'Quiet Time',
      description: 'Independent relaxation period',
      duration: '20 min',
      parentTip: 'Provide calming activities like coloring',
      completed: false,
      theme: 'evening',
    },
    {
      title: 'Bedtime Routine',
      description: 'Wind down for sleep',
      duration: '25 min',
      parentTip: 'Maintain consistent bedtime schedule',
      completed: false,
      theme: 'night',
    },
    {
      title: 'Story Time',
      description: 'Calming bedtime story',
      duration: '15 min',
      parentTip: 'Use predictable, favorite stories',
      completed: false,
      theme: 'night',
    },
  ];

  return taskPool.slice(0, count);
}

function getRecommendations(severity: ScoringResult['severity']): string[] {
  const recommendations = {
    low: [
      'Continue monitoring development',
      'Maintain supportive routines',
    ],
    mild: [
      'Consider scheduling a screening',
      'Document behaviors and patterns',
      'Explore supportive resources',
    ],
    moderate: [
      'Schedule comprehensive evaluation',
      'Consider early intervention services',
      'Connect with support groups',
    ],
    high: [
      'Seek clinical assessment immediately',
      'Contact healthcare provider',
      'Connect with autism specialist',
      'Explore immediate support resources',
    ],
  };

  return recommendations[severity];
}
