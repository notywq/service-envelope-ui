/**
 * TypeScript interfaces and types for Service Envelope Dashboard
 */

// Authentication
export type AuthRole = 'requester' | 'admin' | 'orchestrator' | 'super_admin';

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer' | string;
  expiresIn?: string;
  token?: string;
  user: {
    email: string;
    name?: string;
    role: AuthRole | string;
  };
}

export interface AuthContextType {
  token: string | null;
  user: LoginResponse['user'] | null;
  requestOtp: (email: string) => Promise<{ retryAfterSeconds?: number; message?: string }>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  cancelOtp: (email: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
}

export interface AuthUser {
  email: string;
  name?: string;
  role: AuthRole | string;
  isActive: boolean;
  allowedForOtp: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ApiClientRole = 'orchestrator';

export interface ApiClientRecord {
  clientId: string;
  name: string;
  role: ApiClientRole | string;
  scopes: string[];
  isActive: boolean;
  metadata?: Record<string, any>;
  lastUsedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  rotatedAt?: string | null;
}

export interface ApiClientCredentials {
  clientId: string;
  clientSecret: string;
}

export interface ApiClientSecretResponse {
  success: boolean;
  client: ApiClientRecord;
  credentials: ApiClientCredentials;
  message?: string;
}

export interface ApiClientScope {
  scope: string;
  label: string;
  description?: string;
  endpoints?: string[];
}

export interface ApiClientScopeGroup {
  id: string;
  label: string;
  description?: string;
  scopes: ApiClientScope[];
}

export interface ApiClientScopesResponse {
  scopeGroups: ApiClientScopeGroup[];
  scopes: string[];
  total: number;
}

// Envelopes
export interface RequestEnvelope {
  status: string;
  timestamp: string;
  required: boolean;
  sourceSystem: string;
  validationStatus: string;
  validationErrors: string[];
  parameters: Record<string, string | number | boolean | Date | null>;
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
  details: Record<string, string | number | boolean | Date | null>;
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
  serviceId?: string;
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
  serviceId: string;
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
    [key: string]: string | number | boolean | Date | null | undefined;
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

// ============== PARAMETER SCHEMA TYPES ==============

export type ParameterType = 'String' | 'Number' | 'Boolean' | 'Date' | 'Dropdown' | 'Radio' | 'Checkboxes';

export interface ParameterOption {
  value: string | number;
  label: string;
  description?: string;
}

export interface StringParameter {
  type: 'String';
  required?: boolean;
  description?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: string;
  placeholder?: string;
}

export interface NumberParameter {
  type: 'Number';
  required?: boolean;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  default?: number;
}

export interface BooleanParameter {
  type: 'Boolean';
  required?: boolean;
  description?: string;
  default?: boolean;
}

export interface DateParameter {
  type: 'Date';
  required?: boolean;
  description?: string;
  format?: 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'ISO8601';
  min?: string;
  max?: string;
  default?: string;
}

export interface DropdownParameter {
  type: 'Dropdown';
  required?: boolean;
  description?: string;
  options: ParameterOption[];
  default?: string | number;
}

export interface RadioParameter {
  type: 'Radio';
  required?: boolean;
  description?: string;
  options: ParameterOption[];
  default?: string | number;
}

export interface CheckboxesParameter {
  type: 'Checkboxes';
  required?: boolean;
  description?: string;
  options: ParameterOption[];
  default?: (string | number)[];
  minSelected?: number;
  maxSelected?: number;
}

export type ParameterSchema = 
  | StringParameter 
  | NumberParameter 
  | BooleanParameter 
  | DateParameter 
  | DropdownParameter 
  | RadioParameter 
  | CheckboxesParameter;

export interface RequestEnvelopeSchema {
  parameters: Record<string, ParameterSchema>;
}

export interface ServiceDefinitionWithSchema extends ServiceDefinition {
  request?: RequestEnvelopeSchema;
  approval?: any;
  payment?: any;
  processing?: any;
  delivery?: any;
  feedback?: any;
}

// ============== EMAIL TEMPLATE TYPES ==============

export interface EmailTemplate {
  id: string;
  name: string;
  templateId?: string;
  subject: string;
  htmlBody: string;
  description?: string;
  envelopeType?: 'request' | 'approval' | 'payment' | 'processing' | 'delivery' | 'feedback';
  phase?: 'start' | 'end';
  variables?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailTemplatePreview {
  subject: string;
  htmlBody: string;
  variables: string[];
}

// ============== FEEDBACK TYPES ==============

export interface FeedbackQuestion {
  id: string;
  type: 'rating' | 'text' | 'multiple-choice';
  question: string;
  required?: boolean;
  options?: string[];
  scale?: { min: number; max: number; minLabel?: string; maxLabel?: string };
}

export interface FeedbackResponse {
  requestId: string;
  token: string;
  expiresAt: string;
  questions: FeedbackQuestion[];
  answers?: Record<string, string | number | string[]>;
  submittedAt?: string;
  status: 'pending' | 'submitted' | 'expired';
}

export interface FeedbackSubmitRequest {
  token: string;
  ratings: Record<string, number>;
  comments?: string;
}

// ============== APPROVAL TYPES ==============

export interface ApprovalRequest {
  requestId: string;
  approvalToken: string;
  approverId: string;
  approverRole: string;
  requestDetails: {
    type: string;
    initiatorName: string;
    initiatorEmail: string;
    createdAt: string;
    parameters: Record<string, any>;
  };
  approvalRule: {
    type: 'all_must_approve' | 'any_one' | 'specific_approver' | 'complex';
    otherApprovers?: Array<{ id: string; status: 'pending' | 'approved' | 'denied' }>;
  };
  expiresAt: string;
  status: 'pending' | 'approved' | 'denied';
  approvedAt?: string;
  deniedAt?: string;
}

export interface ApprovalSubmitRequest {
  requestId: string;
  approvalToken: string;
  approved: boolean;
  justification?: string;
  denialReason?: string;
}

export interface ApprovalResponse {
  requestId: string;
  approved: boolean;
  status: 'approved' | 'denied';
  nextEnvelope?: string;
  message: string;
}

// ============== DELIVERY TRACKING TYPES ==============

export interface DeliveryMethod {
  type: 'email' | 'physical_mail' | 'pickup';
  details: Record<string, string>;
  trackingId?: string;
  estimatedDelivery?: string;
}

export interface DeliveryTrackingInfo {
  requestId: string;
  status: 'pending_selection' | 'in_transit' | 'ready_for_pickup' | 'delivered' | 'failed';
  method: DeliveryMethod;
  currentLocation?: string;
  lastUpdate: string;
  estimatedDelivery?: string;
  trackingHistory: Array<{
    status: string;
    location?: string;
    timestamp: string;
    notes?: string;
  }>;
}

// ============== ADMIN LEARNING TYPES ==============

export interface ServiceExample {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'complex';
  yamlDefinition: string;
  explanation: string;
  features: string[];
}

export interface EnvelopeGuide {
  type: 'request' | 'approval' | 'payment' | 'processing' | 'delivery' | 'feedback';
  title: string;
  description: string;
  purpose: string;
  requiredFields: string[];
  optionalFields: string[];
  example: any;
  commonMistakes: string[];
  bestPractices: string[];
}

// ============== UI STATE TYPES ==============

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
