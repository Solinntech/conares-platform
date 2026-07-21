import axios from 'axios';
import type { Client, Project, ProjectItem, Quotation } from './types';

const defaultApiBaseUrl =
  typeof window === 'undefined' ? 'http://localhost:3000/api' : `${window.location.origin}/api`;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl,
});

export const getDashboardSummary = () => api.get('/dashboard').then((res) => res.data);
export const getClients = () => api.get('/clients').then((res) => res.data);
export const createClient = (payload: Partial<Client>) => api.post('/clients', payload).then((res) => res.data);
export const updateClient = (id: string, payload: Partial<Client>) => api.put(`/clients/${id}`, payload).then((res) => res.data);
export const getQuotations = () => api.get('/quotations').then((res) => res.data);
export const createQuotation = (payload: Partial<Quotation>) => api.post('/quotations', payload).then((res) => res.data);
export const updateQuotation = (id: string, payload: Partial<Quotation>) => api.put(`/quotations/${id}`, payload).then((res) => res.data);
export const getProjects = () => api.get('/projects').then((res) => res.data);
export const updateProjectStatus = (id: string, status: Project['status']) => api.put(`/projects/${id}`, { status }).then((res) => res.data);
export const updateProjectItem = (projectId: string, itemId: string, payload: Partial<ProjectItem> & { trackingNote?: string }) =>
  api.put(`/projects/${projectId}/items/${itemId}`, payload).then((res) => res.data);
export const getBilling = () => api.get('/billing').then((res) => res.data);
export const convertQuotation = (id: string) => api.post(`/quotations/${id}/convert`).then((res) => res.data);
