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
  RequestDetailResponse,
  FullServiceRequest,
  PaymentCompleteRequest,
  PaymentCompleteResponse,
  PaymentFailureRequest,
  PaymentFailureResponse,
  RequestFilters,
  AuthUser,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getStoredToken = (): string | null => {
  return localStorage.getItem('accessToken') || localStorage.getItem('token');
};

const clearStoredAuth = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const isPublicAuthFailurePath = (url = ''): boolean => {
  return (
    url.includes('/api/OTP/') ||
    url.includes('/api/approvals/') ||
    url.includes('/api/feedback/token/')
  );
};

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
      const token = getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Interceptor: Handle 401 Unauthorized
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const requestUrl = error.config?.url || '';
        if (error.response?.status === 401 && !isPublicAuthFailurePath(requestUrl)) {
          // Clear token and redirect to login
          clearStoredAuth();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ========== AUTH ENDPOINTS ==========

  async sendOtp(email: string, purpose = 'login'): Promise<{ retryAfterSeconds?: number; message?: string }> {
    const response = await this.client.post('/api/OTP/send', {
      email,
      purpose,
    });
    return response.data;
  }

  async verifyOtp(email: string, code: string, purpose = 'login'): Promise<LoginResponse> {
    const response = await this.client.post<LoginResponse>('/api/OTP/verify', {
      email,
      code,
      purpose,
    });
    const accessToken = response.data.accessToken || response.data.token;
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
      localStorage.removeItem('token');
    }
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  }

  async cancelOtp(email: string, purpose = 'login') {
    const response = await this.client.post('/api/OTP/cancel', { email, purpose });
    return response.data;
  }

  async getCurrentUser(): Promise<LoginResponse['user']> {
    const response = await this.client.get('/api/auth/me');
    return response.data.user || response.data;
  }

  async verifyAuth() {
    const response = await this.client.post('/api/auth/verify');
    return response.data;
  }

  logout(): void {
    clearStoredAuth();
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
    parameters: Record<string, string | number | boolean | Date | null>,
    initiator: string = 'Service Envelope Web UI',
    serviceType?: string
  ): Promise<{ id: string; status: string }> {
    const response = await this.client.post(`/api/requests`, {
      serviceId,
      type: serviceType || serviceId,
      parameters,
      initiator,
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

  async getApprovalRequest(token: string): Promise<RequestDetailResponse> {
    const response = await this.client.get<RequestDetailResponse>(
      `/api/approvals/${token}/request`
    );
    return response.data;
  }

  async approveRequest(
    token: string,
    comment: string = ''
  ): Promise<{ requestId: string; status: string; message: string; allApproved: boolean }> {
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
    id?: string;
    serviceId?: string;
    initiator: string;
    schemaVersion?: string;
    validatedAt?: string;
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
      id?: string;
      serviceId?: string;
      initiator: string;
      schemaVersion?: string;
      validatedAt?: string;
    }
  ) {
    const response = await this.client.put(`/api/admin/services/${serviceId}`, data);
    return response.data;
  }
  async deleteService(serviceId: string) {
    const response = await this.client.delete(`/api/services/${serviceId}`);
    return response.data;
  }

  // ========== AUTH USER ADMIN ENDPOINTS ==========

  async getAuthUsers(): Promise<{ users: AuthUser[] }> {
    const response = await this.client.get('/api/admin/auth-users');
    return response.data;
  }

  async createAuthUser(data: {
    email: string;
    name?: string;
    role: string;
    isActive: boolean;
    allowedForOtp: boolean;
  }) {
    const response = await this.client.post('/api/admin/auth-users', data);
    return response.data;
  }

  async updateAuthUser(email: string, data: Partial<{
    name: string;
    role: string;
    isActive: boolean;
    allowedForOtp: boolean;
  }>) {
    const response = await this.client.put(`/api/admin/auth-users/${encodeURIComponent(email)}`, data);
    return response.data;
  }

  async deleteAuthUser(email: string) {
    const response = await this.client.delete(`/api/admin/auth-users/${encodeURIComponent(email)}`);
    return response.data;
  }

  async flushOtpChallenges() {
    const response = await this.client.post('/api/OTP/flush');
    return response.data;
  }

  // ========== EMAIL TEMPLATE ENDPOINTS ==========

  async getEmailTemplates(filters?: Record<string, any>) {
    const response = await this.client.get('/api/admin/email-templates', { params: filters });
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
    envelopeType?: string;
    phase?: string;
    templateScope?: 'generic' | 'envelope' | 'service';
    eventKey?: string;
    serviceType?: string | null;
    isActive?: boolean;
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
      envelopeType?: string;
      phase?: string;
      templateScope?: 'generic' | 'envelope' | 'service';
      eventKey?: string;
      serviceType?: string | null;
      isActive?: boolean;
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

  // ========== REQUEST DETAILS ENDPOINT ==========

  async getFullRequest(requestId: string): Promise<FullServiceRequest> {
    const response = await this.client.get<FullServiceRequest>(`/api/requests/${requestId}`);
    return response.data;
  }

  // ========== PAYMENT ENDPOINTS ==========

  async completePayment(
    requestId: string,
    data: PaymentCompleteRequest
  ): Promise<PaymentCompleteResponse> {
    const response = await this.client.post<PaymentCompleteResponse>(
      `/api/payments/${requestId}/complete`,
      data
    );
    return response.data;
  }

  async failPayment(
    requestId: string,
    data: PaymentFailureRequest
  ): Promise<PaymentFailureResponse> {
    const response = await this.client.post<PaymentFailureResponse>(
      `/api/payments/${requestId}/failed`,
      data
    );
    return response.data;
  }

  // ========== FEEDBACK ENDPOINTS (TOKEN-BASED, PUBLIC) ==========

  async getFeedbackByToken(token: string) {
    const response = await this.client.get(`/api/feedback/token/${token}`);
    return response.data;
  }

  async submitFeedback(data: {
    token: string;
    ratings: Record<string, number>;
    comments?: string;
  }) {
    const response = await this.client.post(`/api/feedback/token/${data.token}/submit`, {
      ratings: data.ratings,
      comments: data.comments || '',
    });
    return response.data;
  }

  // ========== APPROVAL ENDPOINTS (TOKEN-BASED, PUBLIC) ==========

  async getApprovalByToken(approvalToken: string) {
    const response = await this.client.get(`/api/approvals/${approvalToken}`);
    return response.data;
  }

  async submitApproval(data: {
    requestId: string;
    approvalToken: string;
    approved: boolean;
    justification?: string;
    denialReason?: string;
  }) {
    const response = await this.client.post(`/api/approvals/submit`, data);
    return response.data;
  }

  // ========== DELIVERY ENDPOINTS ==========

  async getDeliveryTracking(requestId: string) {
    const response = await this.client.get(`/api/delivery/${requestId}/tracking`);
    return response.data;
  }

  async getDeliveryMethod(requestId: string) {
    const response = await this.client.get(`/api/delivery/${requestId}/method`);
    return response.data;
  }

  async postDeliveryMethod(requestId: string, data: { method: string; details?: Record<string, any> }) {
    const response = await this.client.post(`/api/delivery/${requestId}/method`, data);
    return response.data;
  }

  async submitDeliveryDetails(
    requestId: string,
    deliveryMethod: 'email' | 'physical_mail' | 'pickup',
    deliveryDetails: Record<string, any>
  ) {
    const response = await this.client.post(`/api/delivery/${requestId}/details`, {
      deliveryMethod,
      deliveryDetails,
    });
    return response.data;
  }

  async getDeliveryStatus(requestId: string) {
    const response = await this.client.get(`/api/delivery-status/${requestId}/current`);
    return response.data;
  }

  async getDeliveryHistory(requestId: string) {
    const response = await this.client.get(`/api/delivery-status/${requestId}/history`);
    return response.data;
  }

  async updateDeliveryStatus(requestId: string, data: { status?: number | string; code_number?: number; code_name?: string; notes?: string; location?: string; trackingId?: string }) {
    const response = await this.client.post(`/api/delivery-status/${requestId}`, data);
    return response.data;
  }

  // ========== SCHEMA ENDPOINTS ==========

  async getSchema() {
    const response = await this.client.get('/api/admin/schema');
    return response.data;
  }

  async getSchemaVersions() {
    const response = await this.client.get('/api/admin/schema/versions');
    return response.data;
  }

  async getLatestSchemaVersion() {
    const response = await this.client.get('/api/admin/schema/versions/latest');
    return response.data;
  }

  async getSchemaVersion(version: string) {
    const response = await this.client.get(`/api/admin/schema/versions/${version}`);
    return response.data;
  }

  async reloadSchema() {
    const response = await this.client.post('/api/admin/schema/reload');
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
