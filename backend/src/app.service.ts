import { Injectable, OnModuleInit } from '@nestjs/common';
import { clients as initialClients, projects as initialProjects, quotations as initialQuotations, type Client, type Project, type ProjectItem, type Quotation, type QuotationItem, type QuoteStatus, type ProjectStatus } from './mock-data';
import { DatabaseService } from './database.service';

@Injectable()
export class AppService implements OnModuleInit {
  private clients: Client[] = this.clone(initialClients);
  private quotations: Quotation[] = this.clone(initialQuotations);
  private projects: Project[] = this.clone(initialProjects);

  constructor(private readonly databaseService: DatabaseService) {}

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  async onModuleInit() {
    await this.databaseService.initialize();

    if (!this.databaseService.isEnabled()) {
      return;
    }

    const persistedState = await this.databaseService.loadState();

    if (persistedState) {
      this.clients = this.clone(persistedState.clients);
      this.quotations = this.clone(persistedState.quotations);
      this.projects = this.clone(persistedState.projects);
      return;
    }

    await this.persistState();
  }

  private async persistState() {
    await this.databaseService.saveState({
      clients: this.clients,
      quotations: this.quotations,
      projects: this.projects,
    });
  }

  getDashboardSummary() {
    return {
      activeProjects: this.projects.length,
      completedProjects: 1,
      delayedProjects: 1,
      pendingActivities: 10,
      inProgressActivities: 8,
      completedActivities: 12,
      readyToBill: 1,
      invoicedProjects: 0,
      monthlyCompliance: 88,
      averageProgress: 64,
      productivityByResponsible: 91,
      complianceByClient: 85,
    };
  }

  getClients() {
    return this.clients;
  }

  getQuotations() {
    return this.quotations;
  }

  getProjects() {
    return this.projects;
  }

  getBilling() {
    return this.projects.flatMap((project) =>
      project.items.map((item) => ({
        id: item.id,
        projectId: project.id,
        project: project.name,
        client: project.client,
        concept: item.concept,
        responsible: item.responsible,
        amount: item.total,
        progress: item.progress,
        status: item.status,
        history: item.history,
      })),
    );
  }

  async createClient(input: Omit<Client, 'id'>) {
    const client: Client = {
      id: `c${Date.now()}`,
      ...input,
    };
    this.clients.push(client);
    await this.persistState();
    return client;
  }

  async updateClient(id: string, input: Partial<Client>) {
    const client = this.clients.find((item) => item.id === id);
    if (!client) {
      throw new Error('Cliente no encontrado');
    }

    const updated = { ...client, ...input };
    this.clients.splice(this.clients.indexOf(client), 1, updated);
    await this.persistState();
    return updated;
  }

  async updateProjectItem(projectId: string, itemId: string, input: Partial<ProjectItem> & { trackingNote?: string }) {
    const project = this.projects.find((item) => item.id === projectId);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    const item = project.items.find((child) => child.id === itemId);
    if (!item) {
      throw new Error('Ítem de proyecto no encontrado');
    }

    const { trackingNote, ...itemChanges } = input;

    const updated: ProjectItem = {
      ...item,
      ...itemChanges,
    };

    if (input.status === 'Completado') {
      updated.status = 'Pendiente por facturar';
      updated.history = [...(updated.history ?? item.history), `Ítem completado y listo para facturar (${new Date().toLocaleDateString()})`];
    } else if (input.status === 'Facturado' && input.status !== item.status) {
      updated.history = [...(updated.history ?? item.history), `Ítem facturado (${new Date().toLocaleDateString()})`];
    } else if (input.status && input.status !== item.status) {
      updated.history = [...(updated.history ?? item.history), `Estado actualizado a ${input.status} (${new Date().toLocaleDateString()})`];
    }

    if (typeof input.progress === 'number' && input.progress !== item.progress) {
      updated.history = [...(updated.history ?? item.history), `Avance actualizado a ${input.progress}% (${new Date().toLocaleDateString()})`];
    }

    if (input.responsible && input.responsible !== item.responsible) {
      updated.history = [...(updated.history ?? item.history), `Responsable actualizado de ${item.responsible} a ${input.responsible} (${new Date().toLocaleDateString()})`];
    }

    if (input.startDate && input.startDate !== item.startDate) {
      updated.history = [...(updated.history ?? item.history), `Fecha de inicio actualizada de ${item.startDate} a ${input.startDate} (${new Date().toLocaleDateString()})`];
    }

    if (input.endDate && input.endDate !== item.endDate) {
      updated.history = [...(updated.history ?? item.history), `Fecha de fin actualizada de ${item.endDate} a ${input.endDate} (${new Date().toLocaleDateString()})`];
    }

    if (trackingNote?.trim()) {
      updated.history = [...(updated.history ?? item.history), `${trackingNote.trim()} (${new Date().toLocaleDateString()})`];
    }

    project.items.splice(project.items.indexOf(item), 1, updated);
    project.progress = Math.round(project.items.reduce((sum, child) => sum + child.progress, 0) / project.items.length);
    project.pendingActivities = project.items.filter((child) => child.status === 'Pendiente' || child.status === 'En curso').length;

    if (project.items.every((child) => child.status === 'Facturado')) {
      project.status = 'Finalizado';
    }

    await this.persistState();
    return project;
  }

  async updateProjectStatus(projectId: string, status: ProjectStatus) {
    const project = this.projects.find((item) => item.id === projectId);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    project.status = status;

    if (status === 'Finalizado') {
      project.progress = 100;
      project.items = project.items.map((item) => {
        if (item.status === 'Facturado') {
          return item;
        }

        return {
          ...item,
          progress: 100,
          status: 'Pendiente por facturar' as ProjectItem['status'],
          history: [...item.history, `Proyecto finalizado, ítem pendiente por facturar (${new Date().toLocaleDateString()})`],
        };
      });
      project.pendingActivities = 0;
    } else {
      project.pendingActivities = project.items.filter((item) => item.status === 'Pendiente' || item.status === 'En curso').length;
    }

    await this.persistState();
    return project;
  }

  async createQuotation(input: {
    clientId?: string;
    client?: string;
    title: string;
    validity: string;
    responsible: string;
    observations?: string;
    status?: QuoteStatus;
    total?: number;
    items?: QuotationItem[];
  }) {
    const client = input.client ?? this.clients.find((item) => item.id === input.clientId)?.name ?? '';
    const items = (input.items ?? []).map((item) => ({ ...item }));
    const total = items.reduce((sum, item) => sum + (item.total ?? 0), 0);

    const quotation: Quotation = {
      id: `q${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      status: input.status ?? 'Borrador',
      total: input.total ?? total,
      observations: input.observations ?? '',
      clientId: input.clientId,
      client,
      title: input.title,
      validity: input.validity,
      responsible: input.responsible,
      items,
    };
    this.quotations.push(quotation);
    await this.persistState();
    return quotation;
  }

  async updateQuotation(id: string, input: Partial<Quotation>) {
    const quotation = this.quotations.find((item) => item.id === id);
    if (!quotation) {
      throw new Error('Cotización no encontrada');
    }

    const items = (input.items ?? quotation.items).map((item) => ({ ...item }));
    const total = items.reduce((sum, item) => sum + (item.total ?? 0), 0);
    const client = input.client ?? this.clients.find((item) => item.id === input.clientId)?.name ?? quotation.client;

    const updated = {
      ...quotation,
      ...input,
      client,
      items,
      total: input.total ?? total,
    };
    this.quotations.splice(this.quotations.indexOf(quotation), 1, updated);
    await this.persistState();
    return updated;
  }

  async convertQuotation(id: string) {
    const quotation = this.quotations.find((item) => item.id === id);
    if (!quotation) {
      return { ok: false, message: 'Cotización no encontrada' };
    }

    const updatedQuotation = { ...quotation, status: 'Convertida en Proyecto' as QuoteStatus };
    const index = this.quotations.findIndex((item) => item.id === id);
    this.quotations.splice(index, 1, updatedQuotation);

    const project: Project = {
      id: `p${this.projects.length + 1}`,
      code: `PRJ-${String(this.projects.length + 1).padStart(3, '0')}`,
      name: quotation.title,
      client: quotation.client,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      responsible: quotation.responsible,
      status: 'Pendiente',
      progress: 0,
      pendingActivities: quotation.items.length,
      items: quotation.items.map((item, index) => ({
        id: `pi-${Date.now()}-${index + 1}`,
        concept: item.concept,
        responsible: quotation.responsible,
        unitValue: item.unitValue,
        quantity: item.quantity,
        total: item.total,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        progress: 0,
        status: 'Pendiente',
        history: ['Ítem creado desde cotización convertida'],
      })),
    };

    this.projects.push(project);

    await this.persistState();

    return {
      ok: true,
      message: 'Cotización convertida a proyecto',
      project,
    };
  }
}
