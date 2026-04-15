/**
 * API Client - Axios configuration and endpoint handlers
 * Communicates with Service Envelope API on port 8000
 */

import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  LoginResponse,
  ServiceListResponse,
  RequestsListResponse,
  ApprovalTokenResponse,
  RequestFilters,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor: Add token to every request
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Interceptor: Handle 401 Unauthorized
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear token and redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ========== AUTH ENDPOINTS ==========

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/api/auth/login', {
      email,
      password,
    });
    localStorage.setItem('token', response.data.token);
    return response.data;
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  // ========== SERVICE ENDPOINTS ==========

  async getServices(): Promise<ServiceListResponse> {
    const response = await this.client.get<ServiceListResponse>('/api/services');
    return response.data;
  }

  async getService(serviceId: string) {
    const response = await this.client.get(`/api/services/${serviceId}`);
    return response.data;
  }

  async submitServiceRequest(
    serviceId: string,
    parameters: Record<string, any>
  ): Promise<{ id: string; status: string }> {
    const response = await this.client.post(`/api/services/${serviceId}/submit`, {
      parameters,
    });
    return response.data;
  }

  // ========== REQUEST ENDPOINTS ==========

  async getRequests(filters?: RequestFilters): Promise<RequestsListResponse> {
    const params = {
      status: filters?.status,
      type: filters?.type,
      limit: filters?.limit || 20,
      offset: filters?.offset || 0,
    };

    // Remove undefined values
    Object.keys(params).forEach(
      (key) => params[key as keyof typeof params] === undefined && delete params[key as keyof typeof params]
    );

    const response = await this.client.get<RequestsListResponse>('/api/requests', {
      params,
    });
    return response.data;
  }

  async getRequest(requestId: string) {
    const response = await this.client.get(`/api/requests/${requestId}`);
    return response.data;
  }

  async resumeRequest(requestId: string) {
    const response = await this.client.post(`/api/requests/${requestId}/resume`);
    return response.data;
  }

  async cancelRequest(requestId: string) {
    const response = await this.client.delete(`/api/requests/${requestId}`);
    return response.data;
  }

  // ========== APPROVAL ENDPOINTS ==========

  async getApprovalToken(token: string): Promise<ApprovalTokenResponse> {
    const response = await this.client.get<ApprovalTokenResponse>(
      `/api/approvals/${token}`
    );
    return response.data;
  }

  async approveRequest(
    token: string,
    comment: string = ''
  ): Promise<{ requestId: string; status: string; message: string }> {
    const response = await this.client.post(
      `/api/approvals/${token}/approve`,
      { comment }
    );
    return response.data;
  }

  async denyRequest(
    token: string,
    reason: string
  ): Promise<{ requestId: string; status: string; message: string }> {
    const response = await this.client.post(
      `/api/approvals/${token}/deny`,
      { reason }
    );
    return response.data;
  }

  // ========== ADMIN ENDPOINTS ==========

  async createService(data: {
    name: string;
    yaml: string;
    type: string;
    initiator: string;
  }) {
    const response = await this.client.post('/api/admin/services', data);
    return response.data;
  }

  async updateService(
    serviceId: string,
    data: {
      name: string;
      yaml: string;
      type: string;
      initiator: string;
    }
  ) {
    const response = await this.client.put(`/api/admin/services/${serviceId}`, data);
    return response.data;
  }

  // ========== EMAIL TEMPLATE ENDPOINTS ==========

  async getEmailTemplates() {
    const response = await this.client.get('/api/admin/email-templates');
    return response.data;
  }

  async getEmailTemplate(templateId: string) {
    const response = await this.client.get(`/api/admin/email-templates/${templateId}`);
    return response.data;
  }

  async createEmailTemplate(data: {
    id: string;
    name: string;
    subject: string;
    htmlBody: string;
    description?: string;
  }) {
    const response = await this.client.post('/api/admin/email-templates', data);
    return response.data;
  }

  async updateEmailTemplate(
    templateId: string,
    data: {
      name: string;
      subject: string;
      htmlBody: string;
      description?: string;
    }
  ) {
    const response = await this.client.put(
      `/api/admin/email-templates/${templateId}`,
      data
    );
    return response.data;
  }

  async deleteEmailTemplate(templateId: string) {
    const response = await this.client.delete(`/api/admin/email-templates/${templateId}`);
    return response.data;
  }

  // ========== HEALTH CHECK ==========

  async health() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// Export singleton instance
export const api = new ApiClient();

export default api;
