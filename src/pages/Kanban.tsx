import { useState } from 'react';
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.project.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        "bg-white p-4 rounded-xl shadow-sm border mb-3 cursor-grab hover:shadow-md transition-all",
        isDragging ? "opacity-50 ring-2 ring-primary-500 border-transparent z-50 scale-105" : "border-slate-200"
      )}
    >
      <div className="font-semibold text-slate-800 text-sm mb-1">{props.project.clientName}</div>
      <div className="flex items-center text-xs text-slate-500 mb-3 space-x-2">
         <Clock className="w-3 h-3" />
         <span>{props.project.date}</span>
      </div>
      <div className="flex items-center justify-between">
         <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
            {new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(props.project.amount)}
         </span>
         
         {/* Helper icons based on status */}
         {props.project.status === 'hiánypótlás' && <AlertCircle className="w-4 h-4 text-red-500" />}
         {props.project.status === 'zárás' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
         {['beadás', 'szerződéskötés', 'folyósítás'].includes(props.project.status) && <FileText className="w-4 h-4 text-blue-400" />}
      </div>
    </div>
  );
}

export default function Kanban() {
  const [projects, setProjects] = useState<Project[]>([
    { id: 'p1', clientName: 'Kovács János', status: 'előkészítés', date: '2026-03-20', amount: 50000 },
    { id: 'p2', clientName: 'Nagy Kft.', status: 'beadás', date: '2026-03-25', amount: 74000 },
    { id: 'p3', clientName: 'Szabó Éva', status: 'hiánypótlás', date: '2026-03-26', amount: 0 },
    { id: 'p4', clientName: 'Tóth István', status: 'folyósítás', date: '2026-03-28', amount: 25000 },
  ]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    // A nagyon egyszerű Drag & Drop (a dnd-kit drop animációhoz column-id kellene igaziból)
    // Most MVP prototípushoz oszlop fölé engedést vizsgálunk
    const overId = over.id as ProjectStatus;
    if (STATUSES.some(s => s.id === overId)) {
        setProjects((items) => 
            items.map(p => p.id === active.id ? { ...p, status: overId } : p)
        );
    }
  };

  return (
    <div className="h-full flex flex-col pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projekt Kanban</h1>
           <p className="text-sm text-slate-500 mt-1">Húzd a projekteket a megfelelő állapotba a státuszváltáshoz és számlázáshoz.</p>
        </div>
      </div>

      <DndContext 
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
          {STATUSES.map((status) => {
             const columnProjects = projects.filter(p => p.status === status.id);
             return (
                 <div key={status.id} className="flex-shrink-0 w-80 bg-slate-100/50 rounded-2xl flex flex-col border border-slate-200/60 overflow-hidden">
                    {/* Column Header */}
                    <div className="p-4 border-b border-slate-200 bg-slate-50/80">
                       <div className="flex items-center justify-between">
                          <span className={clsx("inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", status.color)}>
                            {status.label}
                          </span>
                          <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full shadow-sm">{columnProjects.length}</span>
                       </div>
                    </div>

                    {/* Droppable Area */}
                    <div className="p-4 flex-1 overflow-y-auto">
                        <SortableContext items={columnProjects.map(p => p.id)} strategy={verticalListSortingStrategy}>
                           <div id={status.id} className="min-h-[200px]">
                              {columnProjects.map(project => (
                                 <SortableItem key={project.id} project={project} />
                              ))}
                           </div>
                        </SortableContext>
                    </div>
                 </div>
             );
          })}
        </div>
        <DragOverlay>
            {activeId ? <SortableItem project={projects.find(p => p.id === activeId)!} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
