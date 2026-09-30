import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  Compass,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Plane,
  Mountain,
  Wine,
  Gem,
  Coffee,
  Heart,
} from 'lucide-react';
import { BucketListItem, UserProfile } from '../types';

interface BucketListModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BucketListItem[];
  currentUserId: string;
  currentUserName: string;
  partner: UserProfile | null;
  partnerName: string;
  onAddItem: (item: BucketListItem) => void;
  onToggleItem: (itemId: string, isCompleted: boolean, completedAt?: number) => void;
  onDeleteItem: (itemId: string) => void;
}

const CATEGORIES: { id: BucketListItem['category'] | 'all'; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All Dreams', icon: <Compass className="w-3.5 h-3.5" /> },
  { id: 'travel', label: 'Travel', icon: <Plane className="w-3.5 h-3.5" /> },
  { id: 'date_night', label: 'Date Nights', icon: <Wine className="w-3.5 h-3.5" /> },
  { id: 'adventure', label: 'Adventures', icon: <Mountain className="w-3.5 h-3.5" /> },
  { id: 'milestone', label: 'Milestones', icon: <Gem className="w-3.5 h-3.5" /> },
  { id: 'cozy', label: 'Cozy Moments', icon: <Coffee className="w-3.5 h-3.5" /> },
];

export const BucketListModal: React.FC<BucketListModalProps> = ({
  isOpen,
  onClose,
  items,
  currentUserId,
  currentUserName,
  partner,
  partnerName,
  onAddItem,
  onToggleItem,
  onDeleteItem,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<BucketListItem['category'] | 'all'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<BucketListItem['category']>('travel');
  const [newTargetDate, setNewTargetDate] = useState('');

  const filteredItems = items.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const completedCount = items.filter((i) => i.isCompleted).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: BucketListItem = {
      id: `bucket-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: newTitle.trim(),
      category: newCategory,
      targetDate: newTargetDate || undefined,
      isCompleted: false,
      createdBy: currentUserId,
      createdByName: currentUserName,
      createdAt: Date.now(),
    };

    onAddItem(newItem);
    setNewTitle('');
    setNewTargetDate('');
    setIsAdding(false);
  };

  const getCategoryBadge = (cat: BucketListItem['category']) => {
    switch (cat) {
      case 'travel':
        return { label: 'Travel', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30', icon: '✈️' };
      case 'adventure':
        return { label: 'Adventure', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: '🏔️' };
      case 'date_night':
        return { label: 'Date Night', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: '🍷' };
      case 'milestone':
        return { label: 'Milestone', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: '💍' };
      case 'cozy':
        return { label: 'Cozy', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: '☕' };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border-0 sm:border border-slate-800 rounded-none sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-slate-900/90 border-b border-slate-800 shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Haven-Style Mobile Back Button */}
            <button
              onClick={onClose}
              id="btn-bucket-mobile-back"
              className="p-1.5 -ml-1 text-sky-400 hover:bg-slate-800 rounded-xl transition flex items-center gap-1 text-xs font-bold shrink-0 sm:hidden"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              <span>Back</span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
              <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white truncate">Couple Bucket List</h3>
                <span className="hidden xs:inline-block px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-semibold border border-sky-500/30 shrink-0">
                  Shared Dreams
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Adventures to build together with {partner ? partner.name : partnerName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar Header */}
        <div className="px-6 py-3.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Memories Accomplished</span>
              </span>
              <span className="text-sky-400 font-bold">
                {completedCount} of {items.length} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-rose-500 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-500/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Dream</span>
          </button>
        </div>

        {/* Add New Dream Form Form */}
        {isAdding && (
          <form onSubmit={handleCreateItem} className="p-4 bg-slate-900/90 border-b border-slate-800 space-y-3 animate-in fade-in shrink-0">
            <input
              type="text"
              required
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Watch the sunset in Santorini together..."
              className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="travel">✈️ Travel</option>
                <option value="date_night">🍷 Date Night</option>
                <option value="adventure">🏔️ Adventure</option>
                <option value="milestone">💍 Milestone</option>
                <option value="cozy">☕ Cozy Moment</option>
              </select>

              <input
                type="date"
                value={newTargetDate}
                onChange={(e) => setNewTargetDate(e.target.value)}
                className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none"
              />

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Save Dream
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 overflow-x-auto bg-slate-950/20 border-b border-slate-800/60 shrink-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* List of Bucket Items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Compass className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs">No dreams in this category yet.</p>
              <button
                onClick={() => setIsAdding(true)}
                className="text-xs text-sky-400 hover:underline font-semibold"
              >
                + Add your first shared adventure
              </button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const badge = getCategoryBadge(item.category);
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 group ${
                    item.isCompleted
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-80'
                      : 'bg-slate-800/50 border-slate-700/80 hover:border-sky-500/40'
                  }`}
                >
                  <button
                    onClick={() => onToggleItem(item.id, !item.isCompleted, !item.isCompleted ? Date.now() : undefined)}
                    className="cursor-pointer shrink-0 transition-transform active:scale-90"
                  >
                    {item.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500 hover:text-sky-400" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                        {badge.icon} {badge.label}
                      </span>
                      {item.targetDate && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(item.targetDate).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>

                    <p className={`text-xs sm:text-sm font-medium mt-1 ${
                      item.isCompleted ? 'text-slate-400 line-through' : 'text-white'
                    }`}>
                      {item.title}
                    </p>
                  </div>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg hover:bg-slate-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
