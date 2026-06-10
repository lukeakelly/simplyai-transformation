"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import {
  Plus,
  Settings2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { HORIZON_PALETTE } from "@/lib/constants";
import {
  reorderTasksInHorizon,
  createHorizon,
  updateHorizon,
  deleteHorizon,
  reorderHorizons,
} from "@/app/actions";
import type {
  TaskWithRelations,
  HorizonRecord,
  PersonRecord,
} from "@/lib/data";

const UNSCHEDULED = "unscheduled";

type Card = {
  id: string;
  title: string;
  workstream: string;
  status: string;
  priority: string | null;
  completion: number;
  ownerName: string | null;
};

type Props = {
  tasks: TaskWithRelations[];
  horizons: HorizonRecord[];
  people: PersonRecord[];
};

function toCard(t: TaskWithRelations): Card {
  return {
    id: t.id,
    title: t.title,
    workstream: t.workstream,
    status: t.status,
    priority: t.priority,
    completion: t.completion,
    ownerName: t.owner?.name ?? null,
  };
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

export function TimelineClient({ tasks, horizons }: Props) {
  const [customise, setCustomise] = useState(false);

  // Column order: horizons (by order) then Unscheduled.
  const columnIds = useMemo(
    () => [...horizons.map((h) => h.id), UNSCHEDULED],
    [horizons],
  );

  const buildState = useMemo(() => {
    const map: Record<string, Card[]> = {};
    for (const id of columnIds) map[id] = [];
    for (const t of tasks) {
      const key = t.horizonId && map[t.horizonId] ? t.horizonId : UNSCHEDULED;
      map[key].push(toCard(t));
    }
    return map;
  }, [tasks, columnIds]);

  // Signature changes whenever server data changes, remounting the Board so
  // its local drag state resets cleanly (no setState-in-effect needed).
  const signature = useMemo(() => {
    const h = horizons
      .map((x) => `${x.id}:${x.order}:${x.name}:${x.color}:${x.startDate}:${x.endDate}`)
      .join("|");
    const t = tasks
      .map((x) => `${x.id}:${x.horizonId}:${x.position}:${x.status}:${x.completion}`)
      .join("|");
    return `${h}#${t}`;
  }, [horizons, tasks]);

  return (
    <div className="pt-14 lg:pt-0 flex flex-col h-screen">
      <header className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Timeline</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Drag tasks between horizons. {tasks.length} items across{" "}
            {horizons.length} phases.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCustomise((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold border ${
              customise
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            <Settings2 size={16} /> Customise phases
          </button>
        </div>
      </header>

      <Board
        key={signature}
        initial={buildState}
        horizons={horizons}
        customise={customise}
      />
    </div>
  );
}

function Board({
  initial,
  horizons,
  customise,
}: {
  initial: Record<string, Card[]>;
  horizons: HorizonRecord[];
  customise: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [items, setItems] = useState<Record<string, Card[]>>(initial);

  const [activeId, setActiveId] = useState<string | null>(null);
  const sourceContainer = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function findContainer(id: string): string | undefined {
    if (id in items) return id;
    return Object.keys(items).find((key) =>
      items[key].some((c) => c.id === id),
    );
  }

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    setActiveId(id);
    sourceContainer.current = findContainer(id) ?? null;
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeC = findContainer(String(active.id));
    const overC = findContainer(String(over.id));
    if (!activeC || !overC || activeC === overC) return;

    setItems((prev) => {
      const activeItems = prev[activeC];
      const overItems = prev[overC];
      const activeIndex = activeItems.findIndex((c) => c.id === active.id);
      if (activeIndex === -1) return prev;
      const moved = activeItems[activeIndex];

      let overIndex = overItems.findIndex((c) => c.id === over.id);
      if (overIndex === -1) overIndex = overItems.length;

      return {
        ...prev,
        [activeC]: activeItems.filter((c) => c.id !== active.id),
        [overC]: [
          ...overItems.slice(0, overIndex),
          moved,
          ...overItems.slice(overIndex),
        ],
      };
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) {
      sourceContainer.current = null;
      return;
    }
    const activeC = findContainer(String(active.id));
    const overC = findContainer(String(over.id));
    if (!activeC || !overC) {
      sourceContainer.current = null;
      return;
    }

    let finalItems = items;
    if (activeC === overC) {
      const list = items[activeC];
      const oldIndex = list.findIndex((c) => c.id === active.id);
      const newIndex = list.findIndex((c) => c.id === over.id);
      if (oldIndex !== newIndex && newIndex !== -1) {
        finalItems = {
          ...items,
          [activeC]: arrayMove(list, oldIndex, newIndex),
        };
        setItems(finalItems);
      }
    }

    const src = sourceContainer.current;
    sourceContainer.current = null;

    const containersToPersist = new Set<string>([overC]);
    if (src && src !== overC) containersToPersist.add(src);

    startTransition(async () => {
      for (const containerId of containersToPersist) {
        const horizonId = containerId === UNSCHEDULED ? null : containerId;
        const orderedIds = finalItems[containerId].map((c) => c.id);
        await reorderTasksInHorizon(horizonId, orderedIds);
      }
      router.refresh();
    });
  }

  const activeCard = activeId
    ? Object.values(items)
        .flat()
        .find((c) => c.id === activeId)
    : null;

  function moveColumn(index: number, dir: -1 | 1) {
    const horizonIds = horizons.map((h) => h.id);
    const target = index + dir;
    if (target < 0 || target >= horizonIds.length) return;
    const reordered = arrayMove(horizonIds, index, target);
    startTransition(async () => {
      await reorderHorizons(reordered);
      router.refresh();
    });
  }

  return (
      <div className="flex-1 overflow-x-auto scroll-thin p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full items-start">
            {horizons.map((h, idx) => (
              <Column
                key={h.id}
                id={h.id}
                title={h.name}
                color={h.color}
                subtitle={
                  h.startDate || h.endDate
                    ? `${fmtDate(h.startDate)}${
                        h.endDate ? ` – ${fmtDate(h.endDate)}` : ""
                      }`
                    : undefined
                }
                cards={items[h.id] ?? []}
                customise={customise}
                horizon={h}
                index={idx}
                isFirst={idx === 0}
                isLast={idx === horizons.length - 1}
                onMove={moveColumn}
                onRefresh={() => router.refresh()}
              />
            ))}
            <Column
              id={UNSCHEDULED}
              title="Unscheduled"
              color="#94a3b8"
              cards={items[UNSCHEDULED] ?? []}
              customise={false}
              isFirst
              isLast
              index={-1}
              onMove={moveColumn}
              onRefresh={() => router.refresh()}
            />

            {customise && <AddPhase onRefresh={() => router.refresh()} />}
          </div>

          <DragOverlay>
            {activeCard ? <CardView card={activeCard} dragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>
  );
}

function Column({
  id,
  title,
  subtitle,
  color,
  cards,
  customise,
  horizon,
  index,
  isFirst,
  isLast,
  onMove,
  onRefresh,
}: {
  id: string;
  title: string;
  subtitle?: string;
  color: string;
  cards: Card[];
  customise: boolean;
  horizon?: HorizonRecord;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  onRefresh: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="w-72 shrink-0 flex flex-col bg-slate-100 rounded-xl max-h-full">
      <div
        className="rounded-t-xl px-3 py-2.5 border-b-2"
        style={{ borderColor: color }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: color }}
            />
            <span className="font-semibold text-slate-800 text-sm truncate">
              {title}
            </span>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-white rounded-full px-2 py-0.5 shrink-0">
            {cards.length}
          </span>
        </div>
        {subtitle && (
          <div className="text-xs text-slate-400 mt-1 ml-4.5">{subtitle}</div>
        )}
        {customise && horizon && (
          <PhaseEditor
            horizon={horizon}
            index={index}
            isFirst={isFirst}
            isLast={isLast}
            onMove={onMove}
            onRefresh={onRefresh}
          />
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto scroll-thin p-2 space-y-2 min-h-[120px] transition-colors ${
          isOver ? "bg-blue-50" : ""
        }`}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="text-xs text-slate-400 text-center py-6">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

function SortableCard({ card }: { card: Card }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <CardView card={card} />
    </div>
  );
}

function CardView({ card, dragging }: { card: Card; dragging?: boolean }) {
  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 p-3 cursor-grab active:cursor-grabbing shadow-sm ${
        dragging ? "shadow-lg rotate-1" : ""
      }`}
    >
      <div className="text-sm font-medium text-slate-900 leading-snug">
        {card.title}
      </div>
      <div className="text-xs text-slate-400 mt-1">{card.workstream}</div>
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex items-center gap-1.5">
          <StatusBadge status={card.status} />
        </div>
        <PriorityBadge priority={card.priority} />
      </div>
      <div className="flex items-center justify-between mt-2 gap-2">
        <span className="text-xs text-slate-400 truncate">
          {card.ownerName ?? "Unassigned"}
        </span>
        <span className="text-xs tabular-nums text-slate-400">
          {card.completion}%
        </span>
      </div>
    </div>
  );
}

function PhaseEditor({
  horizon,
  index,
  isFirst,
  isLast,
  onMove,
  onRefresh,
}: {
  horizon: HorizonRecord;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  onRefresh: () => void;
}) {
  const [, startTransition] = useTransition();
  const [name, setName] = useState(horizon.name);
  const [color, setColor] = useState(horizon.color);
  const [start, setStart] = useState(toDateInput(horizon.startDate));
  const [end, setEnd] = useState(toDateInput(horizon.endDate));

  function save() {
    startTransition(async () => {
      await updateHorizon(horizon.id, {
        name,
        color,
        startDate: start || null,
        endDate: end || null,
      });
      onRefresh();
    });
  }

  function remove() {
    if (!confirm(`Delete phase "${horizon.name}"? Its tasks become unscheduled.`))
      return;
    startTransition(async () => {
      await deleteHorizon(horizon.id);
      onRefresh();
    });
  }

  return (
    <div className="mt-2 space-y-2 bg-white rounded-lg p-2 border border-slate-200">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        placeholder="Phase name"
      />
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          onBlur={save}
          className="h-7 w-9 rounded border border-slate-300 cursor-pointer"
        />
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          onBlur={save}
          className="flex-1 rounded border border-slate-300 px-1.5 py-1 text-xs"
        />
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          onBlur={save}
          className="flex-1 rounded border border-slate-300 px-1.5 py-1 text-xs"
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(index, -1)}
            disabled={isFirst}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
            aria-label="Move left"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => onMove(index, 1)}
            disabled={isLast}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
            aria-label="Move right"
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <button
          onClick={remove}
          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
}

function AddPhase({ onRefresh }: { onRefresh: () => void }) {
  const [, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [color, setColor] = useState(HORIZON_PALETTE[0]);

  function add() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createHorizon({ name, color });
      setName("");
      onRefresh();
    });
  }

  return (
    <div className="w-72 shrink-0 bg-white/60 rounded-xl border-2 border-dashed border-slate-300 p-3">
      <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm mb-3">
        <Plus size={16} /> Add phase
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Phase name"
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm mb-2"
      />
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-8 w-10 rounded border border-slate-300 cursor-pointer"
        />
        <button
          onClick={add}
          disabled={!name.trim()}
          className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function toDateInput(d: Date | string | null): string {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
