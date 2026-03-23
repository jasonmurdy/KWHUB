import React, { useMemo } from 'react';
import { Task, Project } from '../types';
import LineChart from './charts/LineChart';
import { DEFAULT_WORKFLOW } from '../constants';

interface BurndownChartViewProps {
  tasks: Task[];
  project: Project | null;
}

const BurndownChartView: React.FC<BurndownChartViewProps> = ({ tasks, project }) => {
  const chartData = useMemo(() => {
    if (!project || tasks.length === 0) return [];

    const projectWorkflow = project.workflow || DEFAULT_WORKFLOW;
    const doneStatusId = projectWorkflow.find(s => s.name.toLowerCase() === 'done')?.id;

    if (!doneStatusId) return []; // Cannot track completion without a 'done' status

    // Get the start and end date for the chart
    const allTaskDates = tasks.map(t => new Date(t.createdAt).getTime());
    if (allTaskDates.length === 0) return [];

    const minDate = new Date(Math.min(...allTaskDates));
    const maxDate = new Date(); // Today

    // Generate dates between minDate and maxDate
    const dates: Date[] = [];
    const currentDate = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    while (currentDate <= maxDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const completedTasksByDate = new Map<string, number>();
    tasks.forEach(task => {
        if (task.status === doneStatusId) {
            const completionDate = new Date(task.dueDate); // Assuming due date is when it was completed
            const dateKey = completionDate.toISOString().split('T')[0];
            completedTasksByDate.set(dateKey, (completedTasksByDate.get(dateKey) || 0) + 1);
        }
    });

    let cumulativeCompleted = 0;
    const dataPoints = dates.map(date => {
      const dateKey = date.toISOString().split('T')[0];
      cumulativeCompleted += completedTasksByDate.get(dateKey) || 0;
      return {
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: cumulativeCompleted,
      };
    });

    return dataPoints;
  }, [tasks, project]);

  if (!project) {
    return (
        <div className="flex h-full items-center justify-center text-center p-8">
            <p className="text-on-surface-variant">Please select a project to view its Burndown Chart.</p>
        </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center p-8">
        <div className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-on-surface">No Tasks for Burndown Chart</h3>
          <p className="text-on-surface-variant">Add tasks to your project to see completion trends.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-surface p-6 rounded-2xl shadow-m3-sm border border-outline/30 flex flex-col">
      <h2 className="text-2xl font-bold text-on-surface mb-6">Task Completion Trend: {project.name}</h2>
      <div className="flex-1 min-h-[300px]">
        {chartData.length > 0 ? (
          <LineChart data={chartData} />
        ) : (
          <div className="flex h-full items-center justify-center text-center text-on-surface-variant">
            <p>No completion data available for the selected period.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BurndownChartView;