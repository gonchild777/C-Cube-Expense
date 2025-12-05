
import { Project, ProjectType, Category } from './types';

export const CATEGORIES: Category[] = [
  { id: 'office', name: '文具/辦公用品', icon: '✏️' },
  { id: 'travel', name: '國內差旅費', icon: '🚄' },
  { id: 'equipment', name: '設備購置', icon: '💻' },
  { id: 'meal', name: '膳雜費/誤餐費', icon: '🍱' },
  { id: 'consumable', name: '耗材/實驗物品', icon: '🧪' },
  { id: 'maintenance', name: '維護費', icon: '🔧' },
];

export const EMPLOYEES = [
  "王小明 (助理)",
  "陳教授 (主持人)",
  "李研究生",
  "張行政"
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'undecided',
    name: '尚未決定 (待確認歸屬)',
    code: 'PENDING-DECISION',
    type: ProjectType.DEPARTMENT,
    budget: 0, // 統籌款通常不設限或後續分配
    remaining: 0,
    pending: 0,
    spent: 0,
    allowedCategories: ['office', 'travel', 'equipment', 'meal', 'consumable', 'maintenance'],
  },
  {
    id: 'p1',
    name: '113年度-AI醫療影像辨識計畫',
    code: '113-2221-E-006-001',
    type: ProjectType.NSTC,
    budget: 1500000,
    remaining: 1500000,
    pending: 0,
    spent: 0,
    allowedCategories: ['office', 'travel', 'consumable', 'equipment'],
  },
  {
    id: 'p2',
    name: '產學-台積電自動化專案',
    code: '113-A001-002',
    type: ProjectType.INDUSTRY,
    budget: 500000,
    remaining: 500000,
    pending: 0,
    spent: 0,
    allowedCategories: ['office', 'travel', 'equipment', 'meal', 'consumable', 'maintenance'],
  },
  {
    id: 'p3',
    name: '系所行政管理費',
    code: 'D-006-ADMIN',
    type: ProjectType.DEPARTMENT,
    budget: 200000,
    remaining: 200000,
    pending: 0,
    spent: 0,
    allowedCategories: ['office', 'meal', 'maintenance'],
  },
];

export const PURCHASE_REQUEST_THRESHOLD = 15000; // NCKU rule: > 15k needs form
