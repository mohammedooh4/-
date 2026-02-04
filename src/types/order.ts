import type { Product } from './product';

export interface OrderItem {
    quantity: number;
    unit_price: number;
    product: Product;
}

export interface OrderWithItems {
    id: number;
    created_at: string;
    total_amount: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    items: OrderItem[];
}
