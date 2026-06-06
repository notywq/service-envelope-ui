export type DeliveryMethod = 'email' | 'physical_mail' | 'pickup';

export type DeliverySimulationPayload = {
  code_number: number;
  code_name?: string;
  notes?: string;
  location?: string;
  trackingId?: string;
};

export interface DeliverySimulationPreset {
  buttonKey: string;
  label: string;
  code_number: number;
  code_name: string;
  payload_code_number: DeliverySimulationPayload;
  payload_code_name: DeliverySimulationPayload;
}

const presetsByMethod: Record<DeliveryMethod, DeliverySimulationPreset[]> = {
  email: [
    {
      buttonKey: 'EMAIL_PENDING',
      label: 'Email Pending',
      code_number: 0,
      code_name: 'email_pending',
      payload_code_number: { code_number: 0, notes: 'Email queued for sending' },
      payload_code_name: { code_number: 0, code_name: 'email_pending', notes: 'Email queued for sending' },
    },
    {
      buttonKey: 'EMAIL_SENT',
      label: 'Email Sent',
      code_number: 1,
      code_name: 'email_sent',
      payload_code_number: { code_number: 1, notes: 'Delivery email sent successfully' },
      payload_code_name: { code_number: 1, code_name: 'email_sent', notes: 'Delivery email sent successfully' },
    },
  ],
  physical_mail: [
    {
      buttonKey: 'MAIL_PREPARING',
      label: 'Preparing',
      code_number: 0,
      code_name: 'preparing',
      payload_code_number: { code_number: 0, notes: 'Preparing package for courier pickup' },
      payload_code_name: { code_number: 0, code_name: 'preparing', notes: 'Preparing package for courier pickup' },
    },
    {
      buttonKey: 'MAIL_READY_TO_DELIVER',
      label: 'Ready to Deliver',
      code_number: 1,
      code_name: 'ready_to_deliver',
      payload_code_number: { code_number: 1, notes: 'Package handed to courier desk' },
      payload_code_name: { code_number: 1, code_name: 'ready_to_deliver', notes: 'Package handed to courier desk' },
    },
    {
      buttonKey: 'MAIL_OUT_FOR_DELIVERY',
      label: 'Out for Delivery',
      code_number: 2,
      code_name: 'out_for_delivery',
      payload_code_number: {
        code_number: 2,
        trackingId: 'TRACK-ABC-123',
        location: 'Manila Sorting Center',
        notes: 'In transit to recipient',
      },
      payload_code_name: {
        code_number: 2,
        code_name: 'out_for_delivery',
        trackingId: 'TRACK-ABC-123',
        location: 'Manila Sorting Center',
        notes: 'In transit to recipient',
      },
    },
    {
      buttonKey: 'MAIL_DELIVERED',
      label: 'Delivered',
      code_number: 3,
      code_name: 'delivered',
      payload_code_number: {
        code_number: 3,
        trackingId: 'TRACK-ABC-123',
        location: 'Recipient Address',
        notes: 'Package delivered and received',
      },
      payload_code_name: {
        code_number: 3,
        code_name: 'delivered',
        trackingId: 'TRACK-ABC-123',
        location: 'Recipient Address',
        notes: 'Package delivered and received',
      },
    },
  ],
  pickup: [
    {
      buttonKey: 'PICKUP_PREPARING',
      label: 'Preparing',
      code_number: 0,
      code_name: 'preparing',
      payload_code_number: { code_number: 0, notes: 'Document is being prepared for pickup' },
      payload_code_name: { code_number: 0, code_name: 'preparing', notes: 'Document is being prepared for pickup' },
    },
    {
      buttonKey: 'PICKUP_READY',
      label: 'Ready for Pickup',
      code_number: 1,
      code_name: 'ready_for_pickup',
      payload_code_number: { code_number: 1, location: 'Registrar Office', notes: 'Document ready at counter' },
      payload_code_name: { code_number: 1, code_name: 'ready_for_pickup', location: 'Registrar Office', notes: 'Document ready at counter' },
    },
    {
      buttonKey: 'PICKUP_COMPLETED',
      label: 'Picked Up',
      code_number: 2,
      code_name: 'picked_up',
      payload_code_number: { code_number: 2, location: 'Registrar Office', notes: 'Student claimed document' },
      payload_code_name: { code_number: 2, code_name: 'picked_up', location: 'Registrar Office', notes: 'Student claimed document' },
    },
  ],
};

export const normalizeDeliveryMethod = (method?: string | null): DeliveryMethod | '' => {
  const normalized = (method || '').toString().toLowerCase();
  if (normalized === 'email' || normalized === 'physical_mail' || normalized === 'pickup') {
    return normalized;
  }
  return '';
};

export const getDeliverySimulationPresets = (method?: string | null): DeliverySimulationPreset[] => {
  const normalized = normalizeDeliveryMethod(method);
  return normalized ? presetsByMethod[normalized] : [];
};

export const buildDeliverySimulationPayload = (
  method: string | null | undefined,
  preset: DeliverySimulationPreset,
  useCodeName = false
): DeliverySimulationPayload => {
  const normalized = normalizeDeliveryMethod(method);
  const payload = useCodeName ? preset.payload_code_name : preset.payload_code_number;

  if (!normalized) {
    return payload;
  }

  return payload;
};