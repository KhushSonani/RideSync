import { api } from './api';

export interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: string;
    attempts: number;
    created_at: number;
}

export interface VerifyPaymentPayload {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    rideId: string;
}

/**
 * Creates a Razorpay order for a completed ride.
 */
export const createPaymentOrder = async (rideId: string, amount: number): Promise<RazorpayOrder> => {
    try {
        const response = await api.post('/payments/create-order', { rideId, amount });
        return response.data.data.order;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to create payment order');
    }
};

/**
 * Verifies the Razorpay payment signature on the backend.
 */
export const verifyPaymentSignature = async (payload: VerifyPaymentPayload): Promise<any> => {
    try {
        const response = await api.post('/payments/verify', payload);
        return response.data.data.ride;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Failed to verify payment');
    }
};
