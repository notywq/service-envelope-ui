/**
 * TypeScript interfaces and types for Service Envelope Dashboard
 */

// Authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    email: string;
    name: string;
    role: string;
  };
}

export interface AuthContextType {
  token: string | null;
  user: LoginResponse['user'] | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Envelopes
export interface RequestEnvelope {
  status: string;
  timestamp: string;
  required: boolean;
  sourceSystem: string;
  validationStatus: string;
  validationErrors: string[];
  parameters: Record<string, any>;
}

export interface Approver {
  id: string;
  role: string;
  status: 'pending' | 'approved' | 'denied';
  approvedAt?: string;
  comment?: string;
}

export interface ApprovalEnvelope {
  status: string;
  timestamp: string;
  required: boolean;
  approvers: Approver[];
  approvalRules: {
    type: 'all_must_approve' | 'any_one' | 'specific_approver' | 'complex';
    requiredApprovers?: string[];
    atLeastOneOf?: string[];
    specificApproverId?: string;
  };
};

export interface Charge {
  item: string;
  amount: number;
  currency: string;
}

export interface PaymentEnvelope {
  status: string;
  timestamp: string;
  required: boolean;
  charges: Charge[];
  paymentMethod: string;
}

export interface ProcessingTask {
  name: string;
  description: string;
  status?: string;
}

export interface ProcessingEnvelope {
  status: string;
  timestamp: string;
  required: boolean;
  tasks: ProcessingTask[];
}

export interface DeliveryEnvelope {
  status: string;
  timestamp: string;
  required: boolean;
  method: string;
  details: Record<string, any>;
  deliveryAttempts: number;
}

export interface FeedbackEnvelope {
  status: string;
  timestamp: string;
  required: boolean;
}

export interface EnvelopeCollection {
  request: RequestEnvelope;
  approval: ApprovalEnvelope;
  payment: PaymentEnvelope;
  processing: ProcessingEnvelope;
  delivery: DeliveryEnvelope;
  feedback: FeedbackEnvelope;
}

export interface HistoryEntry {
  status: string;
  timestamp: string;
  envelope: string;
  notes: string;
}

// Service Request
export interface ServiceRequest {
  id: string;
  type: string;
  initiator: string;
  status: 'queued' | 'processing' | 'pending_external' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  lastUpdated: string;
  history: HistoryEntry[];
  envelopes: EnvelopeCollection;
}

// API Responses
export interface ServiceListResponse {
  count: number;
  services: ServiceDefinition[];
}

export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  type: string;
  yaml?: string;
  envelopes?: Partial<EnvelopeCollection>;
}

export interface RequestsListResponse {
  total: number;
  count: number;
  limit: number;
  offset: number;
  requests: ServiceRequest[];
}

export interface ApprovalTokenResponse {
  token: string;
  requestId: string;
  approverId: string;
  used: boolean;
  expired: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface RequestDetailResponse {
  requestId: string;
  type: string;
  status: 'queued' | 'processing' | 'pending_external' | 'completed' | 'failed' | 'cancelled' | 'pending_approval';
  approverId: string;
  used?: boolean;
  expiresAt: string;
  parameters: {
    studentId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    program?: string;
    numberOfCopies?: number;
    purpose?: string;
    deliveryAddress?: string;
    [key: string]: any;
  };
  approvalStatus?: 'pending_external' | 'approved' | 'denied' | 'cancelled';
  approvers?: Array<{
    id: string;
    status: 'approved' | 'pending' | 'denied';
  }>;
  approvalEnvelope?: ApprovalEnvelope;
}

// Payment-related types
export interface PaymentCharge {
  item: string;
  amount: number;
  currency: string;
}

export interface PaymentEnvelopeDetail {
  required: boolean;
  charges: PaymentCharge[];
  paymentMethod: string;
  status?: string;
}

export interface FullServiceRequest extends ServiceRequest {
  id: string;
  envelopes: EnvelopeCollection;
}

export interface PaymentCompleteRequest {
  transactionId: string;
  amount: number;
  method: string;
  reference: string;
  metadata: {
    paymentTimestamp: string;
    mayaCheckoutId?: string;
    browserInfo?: string;
  };
}

export interface PaymentCompleteResponse {
  requestId: string;
  status: string;
  transactionId: string;
  nextStatus: string;
  message: string;
}

export interface PaymentFailureRequest {
  reason: string;
  errorCode: string;
  metadata: {
    mayaErrorCode?: string;
    attemptNumber: number;
    failureTimestamp: string;
  };
}

export interface PaymentFailureResponse {
  requestId: string;
  status: string;
  reason: string;
  nextStatus: string;
  message: string;
}

// UI State
export interface RequestFilters {
  status?: string;
  type?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface UiNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}
