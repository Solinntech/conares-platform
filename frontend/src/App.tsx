import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  FileText,
  Filter,
  GripVertical,
  LayoutDashboard,
  LineChart,
  ReceiptText,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import './App.css';
import {
  convertQuotation,
  createClient,
  createQuotation,
  getBilling,
  getClients,
  getDashboardSummary,
  getProjects,
  getQuotations,
  updateClient,
  updateProjectItem,
  updateProjectStatus,
  updateQuotation,
} from './api';
import type { BillingItem, Client, DashboardSummary, Project, ProjectItem, Quotation, QuotationItem } from './types';
import { downloadProjectPdf, downloadQuotationPdf } from './pdf';
import quotationLogoUrl from './assets/Logo_Conares.png';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, BarElement, Tooltip, Legend, Filler);

const emptyClientForm = {
  name: '',
  nit: '',
  city: '',
  contact: '',
  phone: '',
  email: '',
  status: 'Activo',
};

const emptyItemForm = {
  concept: '',
  unitValue: '',
  quantity: '1',
};

const emptyQuotationForm = {
  clientId: '',
  client: '',
  title: '',
  validity: '',
  responsible: '',
  observations: '',
  status: 'Borrador',
  total: 0,
  items: [] as QuotationItem[],
};

type UserRole = 'admin' | 'projects-viewer';
type ProjectTab = 'general' | 'activities' | 'log' | 'timeline' | 'documents' | 'history';

type AppUser = {
  username: string;
  password: string;
  name: string;
  role: UserRole;
};

type Toast = {
  id: number;
  message: string;
};

type TermsTemplate = {
  id: string;
  name: string;
  payment: string;
  delivery: string;
  guarantees: string;
  exclusions: string;
  observations: string;
};

type QuoteTerms = Omit<TermsTemplate, 'id' | 'name'>;

type QuoteFinance = {
  discount: number;
  retention: number;
};

type ItemMeta = {
  description: string;
  unit: string;
};

type ProjectDocument = {
  name: string;
  size: number;
  uploadedAt: string;
};

const appUsers: AppUser[] = [
  { username: 'ADMIN', password: 'Conares2026*', name: 'Administrador', role: 'admin' },
  { username: 'Proyectos', password: 'Conares2026*', name: 'Usuario Proyectos', role: 'projects-viewer' },
];

const projectItemStatusOptions: ProjectItem['status'][] = ['Pendiente', 'En curso', 'Completado', 'Pendiente por facturar', 'Facturado'];

const itemConceptOptions = [
  'Instalación de injertos / dobles / platinas / láminas',
  'Mantenimiento / cambio de tuberías o bridas',
  'Soldadura / pulida / grateado general',
  'Instalación / cambio de empaques o O-Ring',
  'Fabricación / instalación de soporte / bases / estructuras',
  'Mantenimiento de tapas de manholes / escotillas',
  'Mantenimiento / reparación de anclas y cadenas',
  'Mantenimiento de winches',
  'Mantenimiento / instalación de llantas para defensa',
  'Ánodos de zinc / seguros',
  'Construcción / reparación de escaleras o peldaños',
  'Maniobra con grúa / diferencial',
  'Otros trabajos menores / reparaciones específicas',
  'Mantenimiento / reparación de imbornales / venteos',
  'Trabajos en pasamanos o barandas',
  'Trabajo en espacios confinados / altura',
  'Mantenimiento / reparación de puertas estancas',
  'Mantenimiento / limpieza de serpentines / enfriadores',
  'Pintura / aplicación de recubrimiento',
];

const defaultTerms: QuoteTerms = {
  payment: '',
  delivery: '',
  guarantees: '',
  exclusions: '',
  observations: '',
};

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];

const extractObservationLine = (observations: string, prefix: string) => {
  const line = observations
    .split('\n')
    .find((entry) => entry.trim().toLowerCase().startsWith(prefix.toLowerCase()));
  if (!line) {
    return '';
  }
  return line.slice(prefix.length).trim();
};

function App() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [quotationForm, setQuotationForm] = useState(emptyQuotationForm);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectTab, setSelectedProjectTab] = useState<ProjectTab>('general');
  const [projectItemDrafts, setProjectItemDrafts] = useState<Record<string, { progress: number; status: ProjectItem['status']; trackingNote: string; startDate: string; endDate: string; responsible: string }>>({});
  const [projectDocuments, setProjectDocuments] = useState<Record<string, ProjectDocument[]>>({});
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<'Todos' | Project['status']>('Todos');
  const [draggedQuotationItemId, setDraggedQuotationItemId] = useState<string | null>(null);
  const [draggedProjectItemId, setDraggedProjectItemId] = useState<string | null>(null);
  const [itemMeta, setItemMeta] = useState<Record<string, ItemMeta>>({});
  const [quoteFinance, setQuoteFinance] = useState<QuoteFinance>({ discount: 0, retention: 0 });
  const [quoteTerms, setQuoteTerms] = useState<QuoteTerms>(defaultTerms);
  const [quotationClientResponsible, setQuotationClientResponsible] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState<TermsTemplate[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('conares-terms-templates');
    if (stored) {
      setTemplates(JSON.parse(stored) as TermsTemplate[]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('conares-terms-templates', JSON.stringify(templates));
  }, [templates]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboard, clientList, quoteList, projectList, billingList] = await Promise.all([
        getDashboardSummary(),
        getClients(),
        getQuotations(),
        getProjects(),
        getBilling(),
      ]);
      setSummary(dashboard);
      setClients(clientList);
      setQuotations(quoteList);
      setProjects(projectList);
      setBillingItems(billingList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const input = document.getElementById('global-search') as HTMLInputElement | null;
        input?.focus();
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        addQuotationItem();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message: feedback }]);
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const isAdmin = currentUser?.role === 'admin';
  const canEditProjects = currentUser?.role === 'admin' || currentUser?.role === 'projects-viewer';
  const selectedClient = selectedClientId ? clients.find((item) => item.id === selectedClientId) ?? null : null;

  const selectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedProjectTab('general');
    const project = projects.find((entry) => entry.id === projectId);
    if (project) {
      const drafts = project.items.reduce((acc, item) => {
        acc[item.id] = {
          progress: item.progress,
          status: item.status,
          trackingNote: '',
          startDate: item.startDate,
          endDate: item.endDate,
          responsible: item.responsible,
        };
        return acc;
      }, {} as Record<string, { progress: number; status: ProjectItem['status']; trackingNote: string; startDate: string; endDate: string; responsible: string }>);
      setProjectItemDrafts(drafts);
    }
  };

  const currentProject = selectedProjectId ? projects.find((project) => project.id === selectedProjectId) ?? null : null;

  const visibleProjects = useMemo(() => {
    return projects.filter((project) => {
      const textMatch = `${project.name} ${project.client} ${project.responsible} ${project.code}`.toLowerCase().includes(globalSearch.toLowerCase());
      const statusMatch = projectFilter === 'Todos' ? true : project.status === projectFilter;
      return textMatch && statusMatch;
    });
  }, [projects, globalSearch, projectFilter]);

  const visibleClients = useMemo(() => {
    return clients.filter((client) => `${client.name} ${client.city} ${client.contact} ${client.nit}`.toLowerCase().includes(globalSearch.toLowerCase()));
  }, [clients, globalSearch]);

  const visibleQuotations = useMemo(() => {
    return quotations.filter((quotation) => `${quotation.client} ${quotation.title} ${quotation.responsible}`.toLowerCase().includes(globalSearch.toLowerCase()));
  }, [quotations, globalSearch]);

  const delayedProjects = projects.filter((project) => new Date(project.endDate) < new Date() && project.status !== 'Finalizado');
  const overdueActivities = projects.flatMap((project) =>
    project.items
      .filter((item) => item.status !== 'Facturado' && new Date(project.endDate) < new Date())
      .map((item) => ({ project, item })),
  );
  const staleProjects = projects.filter((project) => project.items.every((item) => item.history.length < 2));
  const billableActivities = billingItems.filter((item) => item.status === 'Pendiente por facturar');
  const expiringQuotations = quotations.filter((item) => {
    if (!item.validity) {
      return false;
    }
    const days = (new Date(item.validity).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 7 && item.status !== 'Convertida en Proyecto';
  });

  const activityTimeline = useMemo(() => {
    const quoteEvents = quotations.map((item) => ({
      date: item.date,
      time: '08:00',
      user: item.responsible,
      description: `Cotización ${item.title} en estado ${item.status}`,
    }));

    const projectEvents = projects.flatMap((project) =>
      project.items.flatMap((item) =>
        item.history.slice(0, 2).map((historyEntry) => ({
          date: project.startDate,
          time: '09:30',
          user: project.responsible,
          description: `${project.name}: ${historyEntry}`,
        })),
      ),
    );

    return [...quoteEvents, ...projectEvents]
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
      .slice(0, 14);
  }, [projects, quotations]);

  const projectStatusCounts = useMemo(() => {
    return {
      Pendiente: projects.filter((item) => item.status === 'Pendiente').length,
      'En curso': projects.filter((item) => item.status === 'En curso').length,
      Finalizado: projects.filter((item) => item.status === 'Finalizado').length,
    };
  }, [projects]);

  const monthProgressSeries = monthNames.map((month, index) => {
    const base = summary?.averageProgress ?? 0;
    return {
      month,
      progress: Math.max(8, Math.min(98, base - 12 + index * 3)),
      billing: Math.max(0, billableActivities.reduce((acc, entry) => acc + entry.amount, 0) * (0.55 + index * 0.08)),
    };
  });

  const complianceByResponsible = useMemo(() => {
    const grouped = new Map<string, { total: number; count: number }>();
    projects.forEach((project) => {
      const existing = grouped.get(project.responsible) ?? { total: 0, count: 0 };
      grouped.set(project.responsible, { total: existing.total + project.progress, count: existing.count + 1 });
    });
    return Array.from(grouped.entries()).map(([name, value]) => ({
      name,
      compliance: value.count ? Math.round(value.total / value.count) : 0,
    }));
  }, [projects]);

  const quoteVersion = editingQuotationId ? 'V2' : 'V1';
  const quoteNumber = editingQuotationId ? editingQuotationId.toUpperCase() : `Q-${Date.now().toString().slice(-6)}`;

  const quotationSubtotal = quotationForm.items.reduce((sum, item) => sum + item.total, 0);
  const quotationIVA = quotationSubtotal * 0.19;
  const quotationTotal = Math.max(0, quotationSubtotal + quotationIVA - quoteFinance.discount - quoteFinance.retention);

  const billingPendingValue = billableActivities.reduce((acc, item) => acc + item.amount, 0);
  const billingInProcessValue = billingItems
    .filter((item) => item.status === 'En curso' || item.status === 'Completado')
    .reduce((acc, item) => acc + item.amount, 0);
  const billingInvoicedValue = billingItems.filter((item) => item.status === 'Facturado').reduce((acc, item) => acc + item.amount, 0);
  const billingTotalValue = billingItems.reduce((acc, item) => acc + item.amount, 0);

  const handleApprove = async (id: string) => {
    try {
      const updated = await updateQuotation(id, { status: 'Aprobada' });
      setQuotations((prev) => prev.map((quotation) => (quotation.id === id ? updated : quotation)));
      setFeedback('Cotización aprobada. Ya puedes convertirla a proyecto.');
    } catch {
      setFeedback('No fue posible aprobar la cotización');
    }
  };

  const handleConvert = async (id: string) => {
    try {
      const response = await convertQuotation(id);
      setFeedback(response.message || 'Cotización convertida a proyecto');
      if (response.project) {
        setProjects((prev) => [response.project, ...prev]);
      }
      setQuotations((prev) => prev.map((quotation) => (quotation.id === id ? { ...quotation, status: 'Convertida en Proyecto' } : quotation)));
      const billingList = await getBilling();
      setBillingItems(billingList);
    } catch {
      setFeedback('No fue posible convertir la cotización');
    }
  };

  const handleProjectItemChange = (
    _projectId: string,
    itemId: string,
    changes: Partial<{ progress: number; status: ProjectItem['status']; trackingNote: string; startDate: string; endDate: string; responsible: string }>,
  ) => {
    setProjectItemDrafts((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        ...changes,
      },
    }));
  };

  const saveProjectItem = async (projectId: string, itemId: string) => {
    const draft = projectItemDrafts[itemId];
    if (!draft) {
      return;
    }
    try {
      const updatedProject = await updateProjectItem(projectId, itemId, {
        progress: draft.progress,
        status: draft.status,
        startDate: draft.startDate,
        endDate: draft.endDate,
        responsible: draft.responsible,
        trackingNote: draft.trackingNote.trim() || undefined,
      });
      setProjects((prev) => prev.map((project) => (project.id === updatedProject.id ? updatedProject : project)));
      const updatedItem = updatedProject.items.find((item: ProjectItem) => item.id === itemId);
      setProjectItemDrafts((prev) => ({
        ...prev,
        [itemId]: {
          progress: updatedItem?.progress ?? draft.progress,
          status: updatedItem?.status ?? draft.status,
          startDate: updatedItem?.startDate ?? draft.startDate,
          endDate: updatedItem?.endDate ?? draft.endDate,
          responsible: updatedItem?.responsible ?? draft.responsible,
          trackingNote: '',
        },
      }));
      const billingList = await getBilling();
      setBillingItems(billingList);
      setFeedback('Ítem de proyecto actualizado correctamente');
    } catch {
      setFeedback('No fue posible actualizar el ítem de proyecto');
    }
  };

  const handleProjectStatusChange = async (projectId: string, status: Project['status']) => {
    try {
      const updatedProject = await updateProjectStatus(projectId, status);
      setProjects((prev) => prev.map((project) => (project.id === updatedProject.id ? updatedProject : project)));
      if (selectedProjectId === projectId) {
        selectProject(projectId);
      }
      const billingList = await getBilling();
      setBillingItems(billingList);
      setFeedback('Estado del proyecto actualizado correctamente');
    } catch {
      setFeedback('No fue posible actualizar el estado del proyecto');
    }
  };

  const handleBillingStatusChange = async (billingItem: BillingItem, status: BillingItem['status']) => {
    try {
      const updatedProject = await updateProjectItem(billingItem.projectId, billingItem.id, { status });
      setProjects((prev) => prev.map((project) => (project.id === updatedProject.id ? updatedProject : project)));
      const billingList = await getBilling();
      setBillingItems(billingList);
      setFeedback('Estado de facturación actualizado correctamente');
    } catch {
      setFeedback('No fue posible actualizar el estado de facturación');
    }
  };

  const handleClientSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      ...clientForm,
      phone: clientForm.phone || 'Sin registro',
    };

    if (editingClientId) {
      const updated = await updateClient(editingClientId, payload);
      setClients((prev) => prev.map((item) => (item.id === editingClientId ? updated : item)));
      setFeedback('Cliente actualizado correctamente');
    } else {
      const created = await createClient(payload);
      setClients((prev) => [created, ...prev]);
      setFeedback('Cliente creado correctamente');
    }

    setClientForm(emptyClientForm);
    setEditingClientId(null);
  };

  const startClientEdit = (client: Client) => {
    setEditingClientId(client.id);
    setClientForm({
      name: client.name,
      nit: client.nit,
      city: client.city,
      contact: client.contact,
      phone: client.phone,
      email: client.email,
      status: client.status,
    });
    setSelectedClientId(client.id);
  };

  const addQuotationItem = () => {
    const unitValue = Number(itemForm.unitValue);
    const quantity = Number(itemForm.quantity);

    if (!itemForm.concept || !unitValue || !quantity) {
      setFeedback('Complete concepto, valor unitario y cantidad');
      return;
    }

    const newItem: QuotationItem = {
      id: `item-${Date.now()}`,
      concept: itemForm.concept,
      unitValue,
      quantity,
      total: unitValue * quantity,
    };

    setQuotationForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setItemMeta((prev) => ({ ...prev, [newItem.id]: { description: '', unit: 'UN' } }));
    setItemForm(emptyItemForm);
  };

  const duplicateQuotationItem = (itemId: string) => {
    const target = quotationForm.items.find((item) => item.id === itemId);
    if (!target) {
      return;
    }
    const duplicate: QuotationItem = { ...target, id: `item-${Date.now()}` };
    setQuotationForm((prev) => ({ ...prev, items: [...prev.items, duplicate] }));
    setItemMeta((prev) => ({ ...prev, [duplicate.id]: { ...(prev[itemId] ?? { description: '', unit: 'UN' }) } }));
  };

  const removeQuotationItem = (itemId: string) => {
    setQuotationForm((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== itemId) }));
    setItemMeta((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const reorderQuotationItems = (fromId: string, toId: string) => {
    const items = [...quotationForm.items];
    const fromIndex = items.findIndex((item) => item.id === fromId);
    const toIndex = items.findIndex((item) => item.id === toId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return;
    }
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    setQuotationForm((prev) => ({ ...prev, items }));
  };

  const moveQuotationItem = (itemId: string, direction: 'up' | 'down') => {
    const index = quotationForm.items.findIndex((item) => item.id === itemId);
    if (index === -1) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= quotationForm.items.length) {
      return;
    }
    reorderQuotationItems(itemId, quotationForm.items[targetIndex].id);
  };

  const handleQuotationItemField = (itemId: string, field: keyof QuotationItem, value: string) => {
    setQuotationForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) {
          return item;
        }
        if (field === 'concept') {
          return { ...item, concept: value };
        }
        const numeric = Number(value);
        const next = { ...item, [field]: Number.isNaN(numeric) ? 0 : numeric };
        return { ...next, total: next.unitValue * next.quantity };
      }),
    }));
  };

  const handleQuotationSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const selectedClientOption = clients.find((client) => client.id === quotationForm.clientId);
    const payload = {
      clientId: quotationForm.clientId || undefined,
      client: selectedClientOption?.name || quotationForm.client,
      title: quotationForm.title,
      validity: quotationForm.validity,
      responsible: quotationForm.responsible,
      observations: [
        quotationForm.observations,
        `Contacto cliente: ${quotationClientResponsible}`,
        `Forma de pago: ${quoteTerms.payment}`,
        `Tiempo de entrega: ${quoteTerms.delivery}`,
        `Garantías: ${quoteTerms.guarantees}`,
        `Exclusiones: ${quoteTerms.exclusions}`,
        `Condiciones adicionales: ${quoteTerms.observations}`,
      ]
        .filter(Boolean)
        .join('\n'),
      status: quotationForm.status,
      total: quotationTotal,
      items: quotationForm.items,
    };

    if (editingQuotationId) {
      const updated = await updateQuotation(editingQuotationId, payload);
      setQuotations((prev) => prev.map((item) => (item.id === editingQuotationId ? updated : item)));
      setFeedback('Cotización actualizada correctamente');
    } else {
      const created = await createQuotation(payload);
      setQuotations((prev) => [created, ...prev]);
      setFeedback('Cotización creada correctamente');
    }

    setQuotationForm(emptyQuotationForm);
    setEditingQuotationId(null);
    setItemMeta({});
    setQuoteFinance({ discount: 0, retention: 0 });
    setQuoteTerms(defaultTerms);
    setQuotationClientResponsible('');
  };

  const startQuotationEdit = (quotation: Quotation) => {
    setEditingQuotationId(quotation.id);
    setQuotationForm({
      clientId: quotation.clientId || '',
      client: quotation.client,
      title: quotation.title,
      validity: quotation.validity,
      responsible: quotation.responsible,
      observations: quotation.observations,
      status: quotation.status,
      total: quotation.total,
      items: quotation.items ?? [],
    });
    setItemMeta(
      (quotation.items ?? []).reduce((acc, item) => {
        acc[item.id] = { description: '', unit: 'UN' };
        return acc;
      }, {} as Record<string, ItemMeta>),
    );
    setQuotationClientResponsible(extractObservationLine(quotation.observations, 'Contacto cliente:'));
  };

  const saveTermsTemplate = () => {
    if (!templateName.trim()) {
      setFeedback('Asigne un nombre para la plantilla comercial');
      return;
    }
    setTemplates((prev) => [
      {
        id: `${Date.now()}`,
        name: templateName,
        ...quoteTerms,
      },
      ...prev,
    ]);
    setTemplateName('');
    setFeedback('Plantilla guardada correctamente');
  };

  const applyTermsTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }
    setQuoteTerms({
      payment: template.payment,
      delivery: template.delivery,
      guarantees: template.guarantees,
      exclusions: template.exclusions,
      observations: template.observations,
    });
    setFeedback(`Plantilla ${template.name} aplicada`);
  };

  const handleProjectDocumentUpload = (projectId: string, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }
    const uploaded = Array.from(fileList).map((file) => ({
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    }));
    setProjectDocuments((prev) => ({
      ...prev,
      [projectId]: [...(prev[projectId] ?? []), ...uploaded],
    }));
    setFeedback(`${uploaded.length} documento(s) cargado(s) para el proyecto`);
  };

  const exportReportsExcel = () => {
    const header = ['Proyecto', 'Cliente', 'Responsable', 'Estado', 'Avance', 'Facturación'];
    const rows = projects.map((project) => [
      project.name,
      project.client,
      project.responsible,
      project.status,
      `${project.progress}%`,
      billingItems.filter((item) => item.projectId === project.id).reduce((acc, item) => acc + item.amount, 0).toString(),
    ]);

    const csv = [header.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'reporte-operacional.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportReportsPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Reporte Operacional Conares del Caribe S.A.S.', 14, 16);
    doc.setFontSize(10);
    let y = 28;
    projects.forEach((project) => {
      doc.text(`${project.code} | ${project.name} | ${project.client} | ${project.status} | ${project.progress}%`, 14, y);
      y += 7;
      if (y > 275) {
        doc.addPage();
        y = 16;
      }
    });
    doc.save('reporte-operacional.pdf');
  };

  const handleLoginSubmit = (event: FormEvent) => {
    event.preventDefault();
    const user = appUsers.find((candidate) => candidate.username === loginForm.username && candidate.password === loginForm.password);
    if (!user) {
      setFeedback('Usuario o contraseña inválidos');
      return;
    }
    setCurrentUser(user);
    setFeedback('Bienvenido a la consola operacional');
    setLoginForm({ username: '', password: '' });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedProjectId(null);
    setFeedback('Sesión finalizada');
  };

  const indicators = [
    { label: 'Proyectos activos', value: summary?.activeProjects ?? 0, icon: BriefcaseBusiness, tone: 'info', trend: '+4.2%' },
    { label: 'Proyectos finalizados', value: summary?.completedProjects ?? 0, icon: CheckCircle2, tone: 'success', trend: '+2.1%' },
    { label: 'Proyectos retrasados', value: summary?.delayedProjects ?? delayedProjects.length, icon: AlertTriangle, tone: 'danger', trend: '-1.4%' },
    { label: 'Actividades pendientes', value: summary?.pendingActivities ?? 0, icon: ClipboardList, tone: 'warning', trend: '+1.1%' },
    { label: 'Clientes activos', value: clients.filter((item) => item.status === 'Activo').length, icon: Users, tone: 'info', trend: '+3.0%' },
    { label: 'Cotizaciones por aprobar', value: quotations.filter((item) => item.status === 'Enviada').length, icon: FileText, tone: 'warning', trend: '-0.7%' },
    { label: 'Listos para facturar', value: billableActivities.length, icon: ReceiptText, tone: 'success', trend: '+5.4%' },
    { label: 'Facturación del mes', value: `$${Math.round(billingTotalValue).toLocaleString('es-CO')}`, icon: BarChart3, tone: 'info', trend: '+8.8%' },
    { label: 'Cumplimiento operativo', value: `${summary?.monthlyCompliance ?? 0}%`, icon: Sparkles, tone: 'success', trend: '+1.8%' },
    { label: 'Avance promedio', value: `${summary?.averageProgress ?? 0}%`, icon: Clock3, tone: 'info', trend: '+2.4%' },
  ];

  if (!currentUser) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <img src={quotationLogoUrl} alt="Logo Conares" className="login-logo" />
          <p className="pill">SolinnTech Enterprise Suite</p>
          <h1>Centro de Control Operacional</h1>
          <p>Gestione proyectos navales, mantenimiento industrial y facturación en un entorno empresarial moderno.</p>
          <form onSubmit={handleLoginSubmit} className="form-grid single">
            <div className="form-row">
              <label>Usuario</label>
              <input value={loginForm.username} onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })} required />
            </div>
            <div className="form-row">
              <label>Contraseña</label>
              <input type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} required />
            </div>
            <button type="submit" className="btn-primary">Ingresar</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <img src={quotationLogoUrl} alt="Logo Conares" className="brand-logo" />
            <div>
              <h1>CONARES</h1>
              <p>Operational Intelligence</p>
            </div>
          </div>
          <nav>
            {isAdmin ? (
              <NavLink to="/" end>
                <LayoutDashboard size={18} /> Dashboard
              </NavLink>
            ) : null}
            {isAdmin ? (
              <NavLink to="/clients">
                <Users size={18} /> Clientes
              </NavLink>
            ) : null}
            {isAdmin ? (
              <NavLink to="/quotations">
                <FileText size={18} /> Cotizaciones
              </NavLink>
            ) : null}
            <NavLink to="/projects">
              <BriefcaseBusiness size={18} /> Proyectos
            </NavLink>
            {isAdmin ? (
              <NavLink to="/billing">
                <ReceiptText size={18} /> Facturación
              </NavLink>
            ) : null}
            {isAdmin ? (
              <NavLink to="/reports">
                <LineChart size={18} /> Reportes
              </NavLink>
            ) : null}
          </nav>
          <div className="sidebar-note">
            <p>Atajo global</p>
            <strong>Ctrl + K</strong>
            <small>Buscar en toda la plataforma</small>
          </div>
        </aside>

        <main className="content">
          <header className="topbar">
            <div>
              <p className="eyebrow">Conares del Caribe S.A.S.</p>
              <h2>Centro de decisiones operacionales</h2>
            </div>
            <div className="topbar-actions">
              <label className="search-box" htmlFor="global-search">
                <Search size={16} />
                <input
                  id="global-search"
                  placeholder="Buscar clientes, proyectos, responsables..."
                  value={globalSearch}
                  onChange={(event) => setGlobalSearch(event.target.value)}
                />
              </label>
              <span className="badge">{isAdmin ? 'Administrador' : 'Editor de proyectos'}: {currentUser.name}</span>
              <button type="button" className="btn-ghost" onClick={handleLogout}>Cerrar sesión</button>
            </div>
          </header>

          <Routes>
            <Route
              path="/"
              element={isAdmin ? (
                <section className="page-grid">
                  <div className="cards-grid ten-cols">
                    {loading
                      ? Array.from({ length: 10 }).map((_, index) => <div className="skeleton-card" key={index} />)
                      : indicators.map((item) => {
                          const Icon = item.icon;
                          return (
                            <article className={`metric-card tone-${item.tone}`} key={item.label}>
                              <div>
                                <p>{item.label}</p>
                                <h3>{item.value}</h3>
                                <span className="trend">
                                  {item.trend.startsWith('+') ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                  {item.trend}
                                </span>
                              </div>
                              <Icon size={20} />
                            </article>
                          );
                        })}
                  </div>

                  <section className="panel wide">
                    <div className="section-head">
                      <div>
                        <h3>Centro de Alertas Operacionales</h3>
                        <p>Detección automática de riesgos y decisiones urgentes.</p>
                      </div>
                      <span className="chip danger">{delayedProjects.length + overdueActivities.length + staleProjects.length} alertas críticas</span>
                    </div>
                    <div className="alert-grid">
                      <article className="alert-card">
                        <AlertTriangle size={18} />
                        <div>
                          <strong>Proyectos con retrasos</strong>
                          <p>{delayedProjects.length} proyectos fuera de fecha final.</p>
                        </div>
                      </article>
                      <article className="alert-card">
                        <CalendarClock size={18} />
                        <div>
                          <strong>Actividades vencidas</strong>
                          <p>{overdueActivities.length} ítems requieren atención inmediata.</p>
                        </div>
                      </article>
                      <article className="alert-card">
                        <Clock3 size={18} />
                        <div>
                          <strong>Sin actualizaciones recientes</strong>
                          <p>{staleProjects.length} proyectos con bitácora inactiva.</p>
                        </div>
                      </article>
                      <article className="alert-card success">
                        <ReceiptText size={18} />
                        <div>
                          <strong>Actividades listas para facturar</strong>
                          <p>{billableActivities.length} ítems listos para cierre comercial.</p>
                        </div>
                      </article>
                      <article className="alert-card warning">
                        <FileText size={18} />
                        <div>
                          <strong>Cotizaciones próximas a vencer</strong>
                          <p>{expiringQuotations.length} oportunidades por gestionar.</p>
                        </div>
                      </article>
                    </div>
                  </section>

                  <section className="panel">
                    <div className="section-head">
                      <h3>Actividad Reciente</h3>
                    </div>
                    <div className="timeline">
                      {activityTimeline.length === 0 ? (
                        <div className="empty-state">
                          <Sparkles size={22} />
                          <p>No hay movimientos recientes.</p>
                        </div>
                      ) : (
                        activityTimeline.map((event, index) => (
                          <article className="timeline-card" key={`${event.description}-${index}`}>
                            <span className="dot" />
                            <div>
                              <strong>{event.description}</strong>
                              <p>{event.date} · {event.time} · {event.user}</p>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="panel chart-panel">
                    <h3>Estado de proyectos</h3>
                    <Doughnut
                      data={{
                        labels: ['Pendiente', 'En curso', 'Finalizado'],
                        datasets: [
                          {
                            data: [projectStatusCounts.Pendiente, projectStatusCounts['En curso'], projectStatusCounts.Finalizado],
                            backgroundColor: ['#f59e0b', '#3b82f6', '#22c55e'],
                            borderWidth: 0,
                          },
                        ],
                      }}
                    />
                  </section>

                  <section className="panel chart-panel wide">
                    <h3>Avance mensual</h3>
                    <Line
                      data={{
                        labels: monthProgressSeries.map((item) => item.month),
                        datasets: [
                          {
                            label: 'Avance (%)',
                            data: monthProgressSeries.map((item) => item.progress),
                            borderColor: '#0f766e',
                            backgroundColor: 'rgba(15, 118, 110, 0.15)',
                            fill: true,
                            tension: 0.3,
                          },
                        ],
                      }}
                    />
                  </section>

                  <section className="panel chart-panel">
                    <h3>Facturación mensual</h3>
                    <Bar
                      data={{
                        labels: monthProgressSeries.map((item) => item.month),
                        datasets: [
                          {
                            label: 'COP',
                            data: monthProgressSeries.map((item) => Math.round(item.billing)),
                            backgroundColor: '#b91c1c',
                            borderRadius: 6,
                          },
                        ],
                      }}
                    />
                  </section>

                  <section className="panel chart-panel">
                    <h3>Cumplimiento por responsable</h3>
                    <Bar
                      data={{
                        labels: complianceByResponsible.map((item) => item.name),
                        datasets: [
                          {
                            label: 'Cumplimiento %',
                            data: complianceByResponsible.map((item) => item.compliance),
                            backgroundColor: '#334155',
                            borderRadius: 6,
                          },
                        ],
                      }}
                      options={{ indexAxis: 'y' as const }}
                    />
                  </section>
                </section>
              ) : <Navigate to="/projects" replace />}
            />

            <Route
              path="/clients"
              element={isAdmin ? (
                <section className="page-grid clients-grid">
                  <div className="panel">
                    <div className="section-head">
                      <h3>{editingClientId ? 'Actualizar cliente' : 'Nuevo cliente'}</h3>
                    </div>
                    <form onSubmit={handleClientSubmit} className="form-grid">
                      <div className="surface-card">
                        <h4>Información General</h4>
                        <div className="form-row">
                          <label>Razón social</label>
                          <input value={clientForm.name} onChange={(event) => setClientForm({ ...clientForm, name: event.target.value })} required />
                        </div>
                        <div className="form-row">
                          <label>NIT</label>
                          <input value={clientForm.nit} onChange={(event) => setClientForm({ ...clientForm, nit: event.target.value })} required />
                        </div>
                        <div className="form-row">
                          <label>Ciudad</label>
                          <input value={clientForm.city} onChange={(event) => setClientForm({ ...clientForm, city: event.target.value })} required />
                        </div>
                      </div>

                      <div className="surface-card">
                        <h4>Información de Contacto</h4>
                        <div className="form-row">
                          <label>Contacto</label>
                          <input value={clientForm.contact} onChange={(event) => setClientForm({ ...clientForm, contact: event.target.value })} required />
                        </div>
                        <div className="form-row">
                          <label>Teléfono</label>
                          <input value={clientForm.phone} onChange={(event) => setClientForm({ ...clientForm, phone: event.target.value })} required />
                        </div>
                        <div className="form-row">
                          <label>Correo</label>
                          <input type="email" value={clientForm.email} onChange={(event) => setClientForm({ ...clientForm, email: event.target.value })} required />
                        </div>
                      </div>

                      <div className="surface-card">
                        <h4>Información Comercial</h4>
                        <div className="form-row">
                          <label>Estado</label>
                          <select value={clientForm.status} onChange={(event) => setClientForm({ ...clientForm, status: event.target.value })}>
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                          </select>
                        </div>
                        <div className="action-row">
                          <button type="submit" className="btn-primary">{editingClientId ? 'Guardar cambios' : 'Crear cliente'}</button>
                          {editingClientId ? (
                            <button type="button" className="btn-ghost" onClick={() => { setEditingClientId(null); setClientForm(emptyClientForm); }}>
                              Cancelar
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </form>
                  </div>

                  <div className="panel">
                    <h3>Cartera de clientes</h3>
                    <div className="client-list">
                      {visibleClients.map((client) => (
                        <article key={client.id} className={`client-card ${selectedClientId === client.id ? 'active' : ''}`} onClick={() => setSelectedClientId(client.id)}>
                          <div>
                            <strong>{client.name}</strong>
                            <p>{client.city} · {client.contact}</p>
                          </div>
                          <span className={`chip ${client.status === 'Activo' ? 'success' : 'warning'}`}>{client.status}</span>
                          <button type="button" className="btn-link" onClick={(event) => { event.stopPropagation(); startClientEdit(client); }}>
                            Editar
                          </button>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="panel wide">
                    <h3>Ficha del cliente</h3>
                    {selectedClient ? (
                      <div className="detail-grid">
                        <article className="surface-card">
                          <h4>Información general</h4>
                          <p><strong>Razón social:</strong> {selectedClient.name}</p>
                          <p><strong>NIT:</strong> {selectedClient.nit}</p>
                          <p><strong>Estado:</strong> {selectedClient.status}</p>
                        </article>
                        <article className="surface-card">
                          <h4>Proyectos</h4>
                          <p>{projects.filter((item) => item.client === selectedClient.name).length} proyectos asociados</p>
                        </article>
                        <article className="surface-card">
                          <h4>Cotizaciones</h4>
                          <p>{quotations.filter((item) => item.client === selectedClient.name).length} cotizaciones</p>
                        </article>
                        <article className="surface-card">
                          <h4>Facturación</h4>
                          <p>${billingItems.filter((item) => item.client === selectedClient.name).reduce((acc, item) => acc + item.amount, 0).toLocaleString('es-CO')}</p>
                        </article>
                        <article className="surface-card">
                          <h4>Historial</h4>
                          <p>Últimos movimientos en proyectos vinculados.</p>
                        </article>
                        <article className="surface-card">
                          <h4>Documentos y observaciones</h4>
                          <p>Sección lista para anexos comerciales y técnicos.</p>
                        </article>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <Users size={22} />
                        <p>Seleccione un cliente para visualizar su ficha empresarial.</p>
                      </div>
                    )}
                  </div>
                </section>
              ) : <Navigate to="/projects" replace />}
            />

            <Route
              path="/quotations"
              element={isAdmin ? (
                <section className="page-grid quotations-grid">
                  <div className="panel wide quotation-doc">
                    <div className="quotation-head">
                      <div>
                        <p className="eyebrow">Documento comercial</p>
                        <h3>{editingQuotationId ? 'Actualizar cotización' : 'Nueva cotización'}</h3>
                      </div>
                      <div className="quote-meta">
                        <span>Número: {quoteNumber}</span>
                        <span>Versión: {quoteVersion}</span>
                        <span>Fecha: {new Date().toISOString().slice(0, 10)}</span>
                      </div>
                    </div>

                    <form onSubmit={handleQuotationSubmit} className="form-grid">
                      <div className="surface-card">
                        <h4>Resumen superior</h4>
                        <div className="form-row">
                          <label>Cliente</label>
                          <select value={quotationForm.clientId} onChange={(event) => setQuotationForm({ ...quotationForm, clientId: event.target.value, client: clients.find((client) => client.id === event.target.value)?.name || '' })}>
                            <option value="">Seleccione un cliente</option>
                            {clients.map((client) => (
                              <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-row">
                          <label>Responsable Conares</label>
                          <input value={quotationForm.responsible} onChange={(event) => setQuotationForm({ ...quotationForm, responsible: event.target.value })} required />
                        </div>
                        <div className="form-row">
                          <label>Responsable cliente</label>
                          <input value={quotationClientResponsible} onChange={(event) => setQuotationClientResponsible(event.target.value)} placeholder="Nombre del contacto del cliente" />
                        </div>
                        <div className="form-row">
                          <label>Estado</label>
                          <select value={quotationForm.status} onChange={(event) => setQuotationForm({ ...quotationForm, status: event.target.value })}>
                            <option value="Borrador">Borrador</option>
                            <option value="Enviada">Enviada</option>
                            <option value="Aprobada">Aprobada</option>
                            <option value="Rechazada">Rechazada</option>
                          </select>
                        </div>
                        <div className="form-row">
                          <label>Nombre de cotización</label>
                          <input value={quotationForm.title} onChange={(event) => setQuotationForm({ ...quotationForm, title: event.target.value })} required />
                        </div>
                        <div className="form-row">
                          <label>Vigencia</label>
                          <input type="date" value={quotationForm.validity} onChange={(event) => setQuotationForm({ ...quotationForm, validity: event.target.value })} required />
                        </div>
                      </div>

                      <div className="surface-card full">
                        <div className="section-head">
                          <h4>Ítems de cotización</h4>
                          <button type="button" className="btn-ghost" onClick={addQuotationItem}>Agregar fila rápida</button>
                        </div>

                        <div className="item-inline-form">
                          <input
                            list="concept-options"
                            placeholder="Concepto"
                            value={itemForm.concept}
                            onChange={(event) => setItemForm({ ...itemForm, concept: event.target.value })}
                          />
                          <datalist id="concept-options">
                            {itemConceptOptions.map((option) => <option value={option} key={option} />)}
                          </datalist>
                          <input type="number" placeholder="V. unitario" value={itemForm.unitValue} onChange={(event) => setItemForm({ ...itemForm, unitValue: event.target.value })} />
                          <input type="number" placeholder="Cantidad" value={itemForm.quantity} onChange={(event) => setItemForm({ ...itemForm, quantity: event.target.value })} />
                          <button type="button" className="btn-primary" onClick={addQuotationItem}>Insertar</button>
                        </div>

                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th />
                                <th>Concepto</th>
                                <th>Descripción</th>
                                <th>Cantidad</th>
                                <th>Unidad</th>
                                <th>Valor unitario</th>
                                <th>Valor total</th>
                                <th>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {quotationForm.items.map((item) => (
                                <tr
                                  key={item.id}
                                  draggable
                                  onDragStart={() => setDraggedQuotationItemId(item.id)}
                                  onDragOver={(event) => event.preventDefault()}
                                  onDrop={() => {
                                    if (draggedQuotationItemId) {
                                      reorderQuotationItems(draggedQuotationItemId, item.id);
                                    }
                                  }}
                                >
                                  <td className="drag-col"><GripVertical size={14} /></td>
                                  <td>
                                    <input value={item.concept} onChange={(event) => handleQuotationItemField(item.id, 'concept', event.target.value)} />
                                  </td>
                                  <td>
                                    <input
                                      value={itemMeta[item.id]?.description ?? ''}
                                      onChange={(event) => setItemMeta((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? { description: '', unit: 'UN' }), description: event.target.value } }))}
                                    />
                                  </td>
                                  <td>
                                    <input type="number" value={item.quantity} onChange={(event) => handleQuotationItemField(item.id, 'quantity', event.target.value)} />
                                  </td>
                                  <td>
                                    <input
                                      value={itemMeta[item.id]?.unit ?? 'UN'}
                                      onChange={(event) => setItemMeta((prev) => ({ ...prev, [item.id]: { ...(prev[item.id] ?? { description: '', unit: 'UN' }), unit: event.target.value } }))}
                                    />
                                  </td>
                                  <td>
                                    <input type="number" value={item.unitValue} onChange={(event) => handleQuotationItemField(item.id, 'unitValue', event.target.value)} />
                                  </td>
                                  <td>${item.total.toLocaleString('es-CO')}</td>
                                  <td className="actions-cell">
                                    <button type="button" className="btn-ghost" onClick={() => duplicateQuotationItem(item.id)}>Duplicar</button>
                                    <button type="button" className="btn-ghost" onClick={() => moveQuotationItem(item.id, 'up')}>↑</button>
                                    <button type="button" className="btn-ghost" onClick={() => moveQuotationItem(item.id, 'down')}>↓</button>
                                    <button type="button" className="btn-danger" onClick={() => removeQuotationItem(item.id)}>Eliminar</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="surface-card">
                        <h4>Condiciones comerciales</h4>
                        <div className="form-row">
                          <label>Forma de pago</label>
                          <textarea value={quoteTerms.payment} onChange={(event) => setQuoteTerms({ ...quoteTerms, payment: event.target.value })} />
                        </div>
                        <div className="form-row">
                          <label>Tiempo de entrega</label>
                          <textarea value={quoteTerms.delivery} onChange={(event) => setQuoteTerms({ ...quoteTerms, delivery: event.target.value })} />
                        </div>
                        <div className="form-row">
                          <label>Garantías</label>
                          <textarea value={quoteTerms.guarantees} onChange={(event) => setQuoteTerms({ ...quoteTerms, guarantees: event.target.value })} />
                        </div>
                        <div className="form-row">
                          <label>Exclusiones</label>
                          <textarea value={quoteTerms.exclusions} onChange={(event) => setQuoteTerms({ ...quoteTerms, exclusions: event.target.value })} />
                        </div>
                        <div className="form-row">
                          <label>Observaciones</label>
                          <textarea value={quoteTerms.observations} onChange={(event) => setQuoteTerms({ ...quoteTerms, observations: event.target.value })} />
                        </div>
                        <div className="inline-actions">
                          <input placeholder="Nombre de plantilla" value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
                          <button type="button" className="btn-ghost" onClick={saveTermsTemplate}>Guardar plantilla</button>
                        </div>
                        {templates.length > 0 ? (
                          <div className="template-grid">
                            {templates.map((template) => (
                              <button key={template.id} type="button" className="chip" onClick={() => applyTermsTemplate(template.id)}>
                                {template.name}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="surface-card">
                        <h4>Panel de totales</h4>
                        <p>Subtotal: ${quotationSubtotal.toLocaleString('es-CO')}</p>
                        <p>IVA (19%): ${quotationIVA.toLocaleString('es-CO')}</p>
                        <div className="form-row">
                          <label>Descuentos</label>
                          <input type="number" value={quoteFinance.discount} onChange={(event) => setQuoteFinance({ ...quoteFinance, discount: Number(event.target.value) })} />
                        </div>
                        <div className="form-row">
                          <label>Retenciones</label>
                          <input type="number" value={quoteFinance.retention} onChange={(event) => setQuoteFinance({ ...quoteFinance, retention: Number(event.target.value) })} />
                        </div>
                        <p className="grand-total">Valor total: ${quotationTotal.toLocaleString('es-CO')}</p>
                        <div className="action-row">
                          <button type="submit" className="btn-primary">{editingQuotationId ? 'Guardar cotización' : 'Crear cotización'}</button>
                          {editingQuotationId ? (
                            <button type="button" className="btn-ghost" onClick={() => { setEditingQuotationId(null); setQuotationForm(emptyQuotationForm); }}>Cancelar</button>
                          ) : null}
                        </div>
                      </div>
                    </form>
                  </div>

                  <div className="panel wide">
                    <h3>Pipeline de cotizaciones</h3>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Cliente</th>
                            <th>Proyecto</th>
                            <th>Resp. Conares</th>
                            <th>Estado</th>
                            <th>Total</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleQuotations.map((quotation) => (
                            <tr key={quotation.id}>
                              <td>{quotation.client}</td>
                              <td>{quotation.title}</td>
                              <td>{quotation.responsible}</td>
                              <td>{quotation.status}</td>
                              <td>${quotation.total.toLocaleString('es-CO')}</td>
                              <td className="actions-cell">
                                <button type="button" className="btn-ghost" onClick={() => startQuotationEdit(quotation)}>Editar</button>
                                <button type="button" className="btn-ghost" onClick={async () => { await downloadQuotationPdf(quotation); }}>PDF</button>
                                {quotation.status !== 'Aprobada' && quotation.status !== 'Convertida en Proyecto' ? (
                                  <button type="button" className="btn-primary" onClick={() => handleApprove(quotation.id)}>Aprobar</button>
                                ) : null}
                                {quotation.status === 'Aprobada' ? (
                                  <button type="button" className="btn-primary" onClick={() => handleConvert(quotation.id)}>Convertir</button>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              ) : <Navigate to="/projects" replace />}
            />

            <Route
              path="/projects"
              element={
                <section className="page-grid projects-grid">
                  <div className="panel">
                    <div className="section-head">
                      <h3>Proyectos</h3>
                      <div className="inline-actions">
                        <Filter size={16} />
                        <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value as 'Todos' | Project['status'])}>
                          <option value="Todos">Todos</option>
                          <option value="Pendiente">Pendiente</option>
                          <option value="En curso">En curso</option>
                          <option value="Finalizado">Finalizado</option>
                        </select>
                      </div>
                    </div>
                    <div className="project-cards">
                      {visibleProjects.map((project) => (
                        <article key={project.id} className={`project-card ${selectedProjectId === project.id ? 'active' : ''}`} onClick={() => selectProject(project.id)}>
                          <div>
                            <p>{project.code}</p>
                            <h4>{project.name}</h4>
                            <small>{project.client} · {project.responsible}</small>
                          </div>
                          <span className="chip">{project.progress}%</span>
                          {canEditProjects ? (
                            <select
                              value={project.status}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => handleProjectStatusChange(project.id, event.target.value as Project['status'])}
                            >
                              <option value="Pendiente">Pendiente</option>
                              <option value="En curso">En curso</option>
                              <option value="Finalizado">Finalizado</option>
                            </select>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="panel wide">
                    {!currentProject ? (
                      <div className="empty-state">
                        <BriefcaseBusiness size={22} />
                        <p>Seleccione un proyecto para abrir la vista ERP por pestañas.</p>
                      </div>
                    ) : (
                      <>
                        <div className="section-head">
                          <div>
                            <h3>{currentProject.name}</h3>
                            <p>{currentProject.client} · {currentProject.responsible}</p>
                          </div>
                          <button type="button" className="btn-ghost" onClick={async () => { await downloadProjectPdf(currentProject, projectItemDrafts); }}>
                            <Download size={15} /> Descargar resumen PDF
                          </button>
                        </div>

                        <div className="tabs">
                          {[
                            ['general', 'General'],
                            ['activities', 'Actividades'],
                            ['log', 'Bitácora'],
                            ['timeline', 'Cronograma'],
                            ['documents', 'Documentos'],
                            ['history', 'Historial'],
                          ].map(([id, label]) => (
                            <button key={id} type="button" className={selectedProjectTab === id ? 'active' : ''} onClick={() => setSelectedProjectTab(id as ProjectTab)}>
                              {label}
                            </button>
                          ))}
                        </div>

                        {selectedProjectTab === 'general' ? (
                          <div className="detail-grid">
                            <article className="surface-card">
                              <h4>Información general</h4>
                              <p><strong>Código:</strong> {currentProject.code}</p>
                              <p><strong>Inicio:</strong> {currentProject.startDate}</p>
                              <p><strong>Fin:</strong> {currentProject.endDate}</p>
                              <p><strong>Estado:</strong> {currentProject.status}</p>
                            </article>
                            <article className="surface-card">
                              <h4>KPIs</h4>
                              <p><strong>Avance:</strong> {currentProject.progress}%</p>
                              <p><strong>Actividades pendientes:</strong> {currentProject.pendingActivities}</p>
                            </article>
                          </div>
                        ) : null}

                        {selectedProjectTab === 'activities' ? (
                          <div className="kanban-grid">
                            {[
                              { label: 'Pendiente', status: 'Pendiente' as ProjectItem['status'] },
                              { label: 'En proceso', status: 'En curso' as ProjectItem['status'] },
                              { label: 'En revisión', status: 'Completado' as ProjectItem['status'] },
                              { label: 'Finalizado', status: 'Pendiente por facturar' as ProjectItem['status'] },
                              { label: 'Facturado', status: 'Facturado' as ProjectItem['status'] },
                            ].map((column) => (
                              <div
                                key={column.label}
                                className="kanban-column"
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={() => {
                                  if (!draggedProjectItemId || !currentProject) {
                                    return;
                                  }
                                  handleProjectItemChange(currentProject.id, draggedProjectItemId, { status: column.status });
                                  void saveProjectItem(currentProject.id, draggedProjectItemId);
                                  setDraggedProjectItemId(null);
                                }}
                              >
                                <h4>{column.label}</h4>
                                {currentProject.items
                                  .filter((item) => (projectItemDrafts[item.id]?.status ?? item.status) === column.status)
                                  .map((item) => (
                                    <article key={item.id} className="activity-card" draggable onDragStart={() => setDraggedProjectItemId(item.id)}>
                                      <strong>{item.concept}</strong>
                                      <div className="form-row">
                                        <label>Responsable</label>
                                        <input
                                          type="text"
                                          value={projectItemDrafts[item.id]?.responsible ?? item.responsible}
                                          onChange={(event) => handleProjectItemChange(currentProject.id, item.id, { responsible: event.target.value })}
                                        />
                                      </div>
                                      <div className="form-row">
                                        <label>Fecha inicio</label>
                                        <input
                                          type="date"
                                          value={projectItemDrafts[item.id]?.startDate ?? item.startDate}
                                          onChange={(event) => handleProjectItemChange(currentProject.id, item.id, { startDate: event.target.value })}
                                        />
                                      </div>
                                      <div className="form-row">
                                        <label>Fecha fin</label>
                                        <input
                                          type="date"
                                          value={projectItemDrafts[item.id]?.endDate ?? item.endDate}
                                          onChange={(event) => handleProjectItemChange(currentProject.id, item.id, { endDate: event.target.value })}
                                        />
                                      </div>
                                      <div className="form-row">
                                        <label>Avance (%)</label>
                                        <input
                                          type="number"
                                          min={0}
                                          max={100}
                                          value={projectItemDrafts[item.id]?.progress ?? item.progress}
                                          onChange={(event) => handleProjectItemChange(currentProject.id, item.id, { progress: Number(event.target.value) })}
                                        />
                                      </div>
                                      <div className="form-row">
                                        <label>Observaciones</label>
                                        <input
                                          placeholder="Registrar novedad"
                                          value={projectItemDrafts[item.id]?.trackingNote ?? ''}
                                          onChange={(event) => handleProjectItemChange(currentProject.id, item.id, { trackingNote: event.target.value })}
                                        />
                                      </div>
                                      <button type="button" className="btn-primary" onClick={() => saveProjectItem(currentProject.id, item.id)}>Guardar</button>
                                    </article>
                                  ))}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {selectedProjectTab === 'log' ? (
                          <div className="timeline">
                            {currentProject.items.flatMap((item) => item.history.map((entry, index) => ({ item, entry, index }))).map(({ item, entry, index }) => (
                              <article className="timeline-card" key={`${item.id}-${index}`}>
                                <span className="dot" />
                                <div>
                                  <strong>{item.concept}</strong>
                                  <p>{entry}</p>
                                  <small>Usuario: {currentProject.responsible}</small>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : null}

                        {selectedProjectTab === 'timeline' ? (
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Actividad</th>
                                  <th>Fecha inicio</th>
                                  <th>Fecha fin</th>
                                  <th>Último registro</th>
                                  <th>Acción</th>
                                </tr>
                              </thead>
                              <tbody>
                                {currentProject.items.map((item) => (
                                  <tr key={`timeline-${item.id}`}>
                                    <td>{item.concept}</td>
                                    <td>
                                      <input
                                        type="date"
                                        value={projectItemDrafts[item.id]?.startDate ?? item.startDate}
                                        onChange={(event) => handleProjectItemChange(currentProject.id, item.id, { startDate: event.target.value })}
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="date"
                                        value={projectItemDrafts[item.id]?.endDate ?? item.endDate}
                                        onChange={(event) => handleProjectItemChange(currentProject.id, item.id, { endDate: event.target.value })}
                                      />
                                    </td>
                                    <td>{item.history[item.history.length - 1] ?? 'Sin cambios'}</td>
                                    <td>
                                      <button type="button" className="btn-primary" onClick={() => saveProjectItem(currentProject.id, item.id)}>
                                        Guardar fecha
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}

                        {selectedProjectTab === 'documents' ? (
                          <div className="surface-card">
                            <h4>Documentos del proyecto</h4>
                            <div className="form-row">
                              <label>Cargar documentos</label>
                              <input type="file" multiple onChange={(event) => handleProjectDocumentUpload(currentProject.id, event.target.files)} />
                            </div>
                            {projectDocuments[currentProject.id]?.length ? (
                              <ul>
                                {projectDocuments[currentProject.id].map((document, index) => (
                                  <li key={`${document.name}-${index}`}>
                                    {document.name} - {(document.size / 1024).toFixed(1)} KB - {document.uploadedAt.slice(0, 10)}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p>Aún no hay documentos cargados para este proyecto.</p>
                            )}
                          </div>
                        ) : null}

                        {selectedProjectTab === 'history' ? (
                          <div className="surface-card">
                            <h4>Historial consolidado</h4>
                            <ul>
                              {currentProject.items.slice(0, 8).map((item) => (
                                <li key={item.id}>{item.concept}: {item.history[0] ?? 'Sin historial'}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </section>
              }
            />

            <Route
              path="/billing"
              element={isAdmin ? (
                <section className="page-grid">
                  <div className="cards-grid four-cols">
                    <article className="metric-card tone-warning">
                      <p>Valor pendiente</p>
                      <h3>${billingPendingValue.toLocaleString('es-CO')}</h3>
                    </article>
                    <article className="metric-card tone-success">
                      <p>Valor facturado</p>
                      <h3>${billingInvoicedValue.toLocaleString('es-CO')}</h3>
                    </article>
                    <article className="metric-card tone-info">
                      <p>Valor en proceso</p>
                      <h3>${billingInProcessValue.toLocaleString('es-CO')}</h3>
                    </article>
                    <article className="metric-card tone-neutral">
                      <p>Valor total</p>
                      <h3>${billingTotalValue.toLocaleString('es-CO')}</h3>
                    </article>
                  </div>

                  <div className="panel wide">
                    <div className="section-head">
                      <h3>Actividades facturables</h3>
                      <span className="chip">Se muestran solo pendientes por facturar o facturadas</span>
                    </div>
                    {billingItems.filter((item) => item.status === 'Pendiente por facturar' || item.status === 'Facturado').length === 0 ? (
                      <div className="empty-state">
                        <ReceiptText size={22} />
                        <p>No hay actividades facturables en este momento.</p>
                      </div>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Proyecto</th>
                              <th>Cliente</th>
                              <th>Actividad</th>
                              <th>Valor</th>
                              <th>Estado</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {billingItems
                              .filter((item) => item.status === 'Pendiente por facturar' || item.status === 'Facturado')
                              .map((item) => (
                                <tr key={`${item.projectId}-${item.id}`}>
                                  <td>{item.project}</td>
                                  <td>{item.client}</td>
                                  <td>{item.concept}</td>
                                  <td>${item.amount.toLocaleString('es-CO')}</td>
                                  <td>
                                    <select value={item.status} onChange={(event) => handleBillingStatusChange(item, event.target.value as BillingItem['status'])}>
                                      {projectItemStatusOptions
                                        .filter((status) => status === 'Pendiente por facturar' || status === 'Facturado')
                                        .map((status) => (
                                          <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                  </td>
                                  <td>
                                    <button type="button" className="btn-primary" onClick={() => handleBillingStatusChange(item, 'Facturado')}>Generar factura</button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              ) : <Navigate to="/projects" replace />}
            />

            <Route
              path="/reports"
              element={isAdmin ? (
                <section className="page-grid">
                  <div className="panel">
                    <div className="section-head">
                      <h3>Módulo de Reportes</h3>
                      <div className="inline-actions">
                        <button type="button" className="btn-ghost" onClick={exportReportsPdf}>Exportar PDF</button>
                        <button type="button" className="btn-primary" onClick={exportReportsExcel}>Exportar Excel</button>
                      </div>
                    </div>
                    <div className="form-grid">
                      <div className="form-row"><label>Cliente</label><input placeholder="Filtrar por cliente" /></div>
                      <div className="form-row"><label>Proyecto</label><input placeholder="Filtrar por proyecto" /></div>
                      <div className="form-row"><label>Responsable</label><input placeholder="Filtrar por responsable" /></div>
                      <div className="form-row"><label>Fecha</label><input type="date" /></div>
                      <div className="form-row"><label>Estado</label><select><option>Todos</option><option>Pendiente</option><option>En curso</option><option>Finalizado</option></select></div>
                      <div className="form-row"><label>Facturación</label><select><option>Todos</option><option>Pendiente</option><option>Facturado</option></select></div>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Proyecto</th>
                            <th>Cliente</th>
                            <th>Responsable</th>
                            <th>Estado</th>
                            <th>Avance</th>
                            <th>Facturación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projects.slice(0, 10).map((project) => (
                            <tr key={project.id}>
                              <td>{project.name}</td>
                              <td>{project.client}</td>
                              <td>{project.responsible}</td>
                              <td>{project.status}</td>
                              <td>{project.progress}%</td>
                              <td>${billingItems.filter((item) => item.projectId === project.id).reduce((acc, item) => acc + item.amount, 0).toLocaleString('es-CO')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              ) : <Navigate to="/projects" replace />}
            />

            <Route path="*" element={<Navigate to={isAdmin ? '/' : '/projects'} replace />} />
          </Routes>
        </main>

        <div className="toast-stack">
          {toasts.map((toast) => (
            <article key={toast.id} className="toast">{toast.message}</article>
          ))}
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
