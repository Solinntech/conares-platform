export type QuoteStatus = 'Borrador' | 'Enviada' | 'Aprobada' | 'Rechazada' | 'Convertida en Proyecto';
export type ProjectStatus = 'Pendiente' | 'En curso' | 'Finalizado';

export interface Client {
  id: string;
  name: string;
  nit: string;
  city: string;
  contact: string;
  phone: string;
  email: string;
  status: 'Activo' | 'Inactivo';
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
  status: QuoteStatus;
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
  status: ProjectStatus;
  progress: number;
  pendingActivities: number;
  items: ProjectItem[];
}

export const clients: Client[] = [
  {
    id: 'c1',
    name: 'Concretos del Caribe S.A.S.',
    nit: '900123456-7',
    city: 'Barranquilla',
    contact: 'Laura Méndez',
    phone: '3019876543',
    email: 'laura@concretos.com',
    status: 'Activo',
  },
  {
    id: 'c2',
    name: 'Vías y Obras del Norte Ltda.',
    nit: '900765432-1',
    city: 'Santa Marta',
    contact: 'Camilo Rojas',
    phone: '3201112233',
    email: 'camilo@viasnorte.co',
    status: 'Activo',
  },
];

export const quotations: Quotation[] = [
  {
    id: 'q1',
    clientId: 'c1',
    client: 'Concretos del Caribe S.A.S.',
    title: 'Fabricación de estructura metálica',
    date: '2026-05-10',
    validity: '2026-06-10',
    responsible: 'Ana Torres',
    status: 'Aprobada',
    total: 185000000,
    observations: 'Incluye montaje y entrega en sitio.',
    items: [
      {
        id: 'qi1',
        concept: 'Fabricación de estructura metálica',
        unitValue: 185000000,
        quantity: 1,
        total: 185000000,
      },
    ],
  },
  {
    id: 'q2',
    clientId: 'c2',
    client: 'Vías y Obras del Norte Ltda.',
    title: 'Mantenimiento de compuertas',
    date: '2026-05-12',
    validity: '2026-06-12',
    responsible: 'Mateo León',
    status: 'Enviada',
    total: 78000000,
    observations: 'Requiere visita técnica previa.',
    items: [
      {
        id: 'qi2',
        concept: 'Servicio de mantenimiento',
        unitValue: 78000000,
        quantity: 1,
        total: 78000000,
      },
    ],
  },
];

export const projects: Project[] = [
  {
    id: 'p1',
    code: 'PRJ-001',
    name: 'Fabricación de estructura metálica',
    client: 'Concretos del Caribe S.A.S.',
    startDate: '2026-05-20',
    endDate: '2026-07-20',
    responsible: 'Luis Ramírez',
    status: 'En curso',
    progress: 68,
    pendingActivities: 4,
    items: [
      {
        id: 'pi1',
        concept: 'Diseño de estructura',
        responsible: 'Luis Ramírez',
        unitValue: 50000000,
        quantity: 1,
        total: 50000000,
        startDate: '2026-05-20',
        endDate: '2026-05-30',
        progress: 100,
        status: 'Facturado',
        history: ['Item creado en Planeación', 'Facturado el 2026-05-25'],
      },
      {
        id: 'pi2',
        concept: 'Fabricación de perfiles',
        responsible: 'Luis Ramírez',
        unitValue: 85000000,
        quantity: 1,
        total: 85000000,
        startDate: '2026-05-31',
        endDate: '2026-06-30',
        progress: 50,
        status: 'En curso',
        history: ['Item en producción', '50% completado'],
      },
      {
        id: 'pi3',
        concept: 'Montaje en sitio',
        responsible: 'Luis Ramírez',
        unitValue: 50000000,
        quantity: 1,
        total: 50000000,
        startDate: '2026-07-01',
        endDate: '2026-07-20',
        progress: 0,
        status: 'Pendiente',
        history: ['Esperando inicio de montaje'],
      },
    ],
  },
  {
    id: 'p2',
    code: 'PRJ-002',
    name: 'Mantenimiento de compuertas',
    client: 'Vías y Obras del Norte Ltda.',
    startDate: '2026-06-01',
    endDate: '2026-08-01',
    responsible: 'Sofía Gómez',
    status: 'Pendiente',
    progress: 24,
    pendingActivities: 6,
    items: [
      {
        id: 'pi4',
        concept: 'Inspección previa',
        responsible: 'Sofía Gómez',
        unitValue: 15000000,
        quantity: 1,
        total: 15000000,
        startDate: '2026-06-01',
        endDate: '2026-06-08',
        progress: 100,
        status: 'Facturado',
        history: ['Inspección completada', 'Facturado parcialmente'],
      },
      {
        id: 'pi5',
        concept: 'Reparación de compuertas',
        responsible: 'Sofía Gómez',
        unitValue: 63000000,
        quantity: 1,
        total: 63000000,
        startDate: '2026-06-09',
        endDate: '2026-08-01',
        progress: 10,
        status: 'En curso',
        history: ['Trabajo iniciado', '10% completado'],
      },
    ],
  },
  {
    id: 'p3',
    code: 'PRJ-003',
    name: 'Instalación de paneles solares',
    client: 'Concretos del Caribe S.A.S.',
    startDate: '2026-04-10',
    endDate: '2026-06-10',
    responsible: 'Julián Pérez',
    status: 'Finalizado',
    progress: 100,
    pendingActivities: 0,
    items: [
      {
        id: 'pi6',
        concept: 'Instalación eléctrica',
        responsible: 'Julián Pérez',
        unitValue: 120000000,
        quantity: 1,
        total: 120000000,
        startDate: '2026-04-10',
        endDate: '2026-06-10',
        progress: 100,
        status: 'Pendiente por facturar',
        history: ['Instalación completada', 'El ítem está listo para facturar'],
      },
    ],
  },
];
