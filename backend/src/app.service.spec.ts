import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    service = new AppService();
  });

  it('creates a new client', () => {
    const client = service.createClient({
      name: 'Nuevo cliente',
      nit: '900999888-1',
      city: 'Bogotá',
      contact: 'Diana',
      phone: '3000000000',
      email: 'diana@test.com',
      status: 'Activo',
    });

    expect(client.id).toBeDefined();
    expect(client.name).toBe('Nuevo cliente');
  });

  it('updates an existing client', () => {
    const created = service.createClient({
      name: 'Cliente A',
      nit: '111',
      city: 'Cali',
      contact: 'Ana',
      phone: '111',
      email: 'ana@test.com',
      status: 'Activo',
    });

    const updated = service.updateClient(created.id, { city: 'Medellín' });

    expect(updated.city).toBe('Medellín');
  });

  it('creates a quotation with draft status', () => {
    const quotation = service.createQuotation({
      client: 'Cliente',
      title: 'Cotización demo',
      validity: '2026-07-10',
      responsible: 'Carlos',
      observations: 'Prueba',
    });

    expect(quotation.status).toBe('Borrador');
    expect(quotation.title).toBe('Cotización demo');
  });

  it('updates an existing quotation', () => {
    const created = service.createQuotation({
      client: 'Cliente',
      title: 'Cotización demo',
      validity: '2026-07-10',
      responsible: 'Carlos',
      observations: 'Prueba',
    });

    const updated = service.updateQuotation(created.id, { status: 'Enviada' });

    expect(updated.status).toBe('Enviada');
  });
});
