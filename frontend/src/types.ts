export interface Client {
  id: string;
  name: string;
  nit: string;
  city: string;
  contact: string;
  phone: string;
  email: string;
  status: string;
}

export interface QuotationItem {
  id: string;
  concept: string;
  unitValue: number;
  quantity: number;
  total: number;
}

export interface Quotation {
  id: string;
  clientId?: string;
  client: string;
  title: string;
  date: string;
  validity: string;
  responsible: string;
  status: string;
  total: number;
  observations: string;
  items: QuotationItem[];
}

export interface ProjectItem {
  id: string;
  concept: string;
  responsible: string;
  unitValue: number;
  quantity: number;
  total: number;
  startDate: string;
  endDate: string;
  progress: number;
  status: 'Pendiente' | 'En curso' | 'Completado' | 'Pendiente por facturar' | 'Facturado';
  history: string[];
}

export interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  startDate: string;
  endDate: string;
  responsible: string;
  status: 'Pendiente' | 'En curso' | 'Finalizado';
  progress: number;
  pendingActivities: number;
  items: ProjectItem[];
}

export interface BillingItem {
  id: string;
  projectId: string;
  project: string;
  client: string;
  concept: string;
  amount: number;
  progress: number;
  status: 'Pendiente' | 'En curso' | 'Completado' | 'Pendiente por facturar' | 'Facturado';
  history: string[];
}

export interface DashboardSummary {
  activeProjects: number;
  completedProjects: number;
  delayedProjects: number;
  pendingActivities: number;
  inProgressActivities: number;
  completedActivities: number;
  readyToBill: number;
  invoicedProjects: number;
  monthlyCompliance: number;
  averageProgress: number;
  productivityByResponsible: number;
  complianceByClient: number;
}
