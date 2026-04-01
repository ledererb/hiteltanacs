import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DndContext, closestCenter, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

// Type definitions
type ProjectStatus = 'előkészítés' | 'beadás' | 'hiánypótlás' | 'szerződéskötés' | 'folyósítás' | 'zárás';

interface Project {
  id: string;
  clientName: string;
  status: ProjectStatus;
  date: string;
  amount: number;
}

const STATUSES: { id: ProjectStatus; label: string; color: string }[] = [
  { id: 'előkészítés', label: 'Előkészítés', color: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20' },
  { id: 'beadás', label: 'Beadás', color: 'bg-blue-100 text-blue-800 ring-blue-700/10' },
  { id: 'hiánypótlás', label: 'Hiánypótlás', color: 'bg-red-100 text-red-800 ring-red-600/10' },
  { id: 'szerződéskötés', label: 'Szerződéskötés', color: 'bg-purple-100 text-purple-800 ring-purple-600/10' },
  { id: 'folyósítás', label: 'Folyósítás', color: 'bg-indigo-100 text-indigo-800 ring-indigo-600/10' },
  { id: 'zárás', label: 'Zárás', color: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20' },
];

function SortableItem(props: { project: Project }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: props.project.id,
    data: {
      type: 'Project',
      project: props.project
    }
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        "bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border mb-3 cursor-grab hover:shadow-md transition-all",
        isDragging ? "opacity-50 ring-2 ring-primary-500 border-transparent z-50 scale-105" : "border-slate-200 dark:border-slate-800"
      )}
    >
      <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-1">{props.project.clientName}</div>
      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mb-3 space-x-2">
         <Clock className="w-3 h-3" />
         <span>{props.project.date}</span>
      </div>
      <div className="flex items-center justify-between">
         <span className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md transition-colors">
            {new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(props.project.amount)}
         </span>
         
         {/* Helper icons based on status */}
         {props.project.status === 'hiánypótlás' && <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />}
         {props.project.status === 'zárás' && <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />}
         {['beadás', 'szerződéskötés', 'folyósítás'].includes(props.project.status) && <FileText className="w-4 h-4 text-blue-400 dark:text-blue-500" />}
      </div>
    </div>
  );
}

function KanbanColumn({ status, projects }: { status: any, projects: Project[] }) {
  const { setNodeRef } = useDroppable({
    id: status.id,
    data: {
      type: 'Column',
      status: status.id
    }
  });

  return (
    <div className="flex-shrink-0 w-80 2xl:w-96 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl flex flex-col border border-slate-200/60 dark:border-slate-800 overflow-hidden transition-colors h-full max-h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 transition-colors">
         <div className="flex items-center justify-between">
            <span className={clsx("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset mix-blend-multiply dark:mix-blend-normal", status.color)}>
              {status.label}
            </span>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full shadow-sm transition-colors">{projects.length}</span>
         </div>
      </div>
      <div ref={setNodeRef} className="p-4 flex-1 overflow-y-auto">
          <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
             <div className="min-h-[200px] h-full">
                {projects.map(project => (
                   <SortableItem key={project.id} project={project} />
                ))}
             </div>
          </SortableContext>
      </div>
    </div>
  );
}

export default function Kanban() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) return;

        const { data, error } = await supabase
          .from('projects')
          .select('id, status, created_at, clients(name)');

        if (error) throw error;

        const mappedProjects = data.map((project: any) => ({
          id: project.id,
          clientName: project.clients ? (Array.isArray(project.clients) ? project.clients[0]?.name : project.clients.name) : 'Ismeretlen',
          status: project.status,
          date: new Date(project.created_at).toISOString().split('T')[0],
          amount: 0 // Cél: később valós dokumentum vagy hitelezési érték
        }));

        setProjects(mappedProjects);
      } catch (error) {
        console.error('Hiba a projektek lekérdezésekor:', error);
      }
    }
    
    fetchProjects();
  }, []);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeProject = projects.find(p => p.id === activeId);
    if (!activeProject) return;

    let newStatus: ProjectStatus | undefined = undefined;

    const isOverAColumn = over.data.current?.type === 'Column';
    const isOverAProject = over.data.current?.type === 'Project';

    if (isOverAColumn) {
      newStatus = over.data.current?.status;
    } else if (isOverAProject) {
      newStatus = over.data.current?.project?.status;
    }

    if (newStatus && newStatus !== activeProject.status) {
        // Optimistic UI UI módosítás
        setProjects((items) => 
            items.map(p => p.id === activeId ? { ...p, status: newStatus as ProjectStatus } : p)
        );

        // Supabase update a háttérben
        const { error } = await supabase
          .from('projects')
          .update({ status: newStatus })
          .eq('id', activeId);
          
        if (error) {
          console.error("Házirend vagy DB hiba a státuszváltásnál:", error);
        }
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-0">
      <div className="mb-6 flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">Projekt Kanban</h1>
           <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors">Húzd a projekteket a megfelelő állapotba a státuszváltáshoz és számlázáshoz.</p>
        </div>
      </div>

      <DndContext 
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-6 overflow-x-auto overflow-y-hidden pb-4 px-2 min-h-0">
          {STATUSES.map((status) => {
             const columnProjects = projects.filter(p => p.status === status.id);
             return <KanbanColumn key={status.id} status={status} projects={columnProjects} />;
          })}
        </div>
        <DragOverlay>
            {activeId ? <SortableItem project={projects.find(p => p.id === activeId)!} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
