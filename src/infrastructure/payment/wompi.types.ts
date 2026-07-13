export type WompiTransactionStatus =
  'APPROVED' | 'DECLINED' | 'PENDING' | 'ERROR' | 'VOIDED' | 'PENDING_APPROVAL';

export interface WompiTokenResponse {
  status?: string;
  data?: {
    id: string;
  };
  error?: {
    reason?: string;
    messages?: Record<string, string[]>;
  };
}

export interface WompiMerchantResponse {
  data?: {
    presigned_acceptance?: {
      acceptance_token: string;
    };
    presigned_personal_data_auth?: {
      acceptance_token: string;
    };
  };
  error?: {
    reason?: string;
  };
}

export interface WompiTransactionData {
  id: string;
  status: WompiTransactionStatus;
  amount_in_cents: number;
  currency: string;
  reference: string;
  status_message?: string | null;
}

export interface WompiTransactionResponse {
  data?: WompiTransactionData;
  error?: {
    reason?: string;
    messages?: Record<string, string[]>;
  };
}
