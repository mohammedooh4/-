import { OrderWithItems } from '@/types/order';
import { Package, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface OrderCardProps {
    order: OrderWithItems;
}

const statusLabels: Record<string, string> = {
    pending: 'في الانتظار',
    confirmed: 'مؤكد',
    preparing: 'قيد التحضير',
    shipped: 'تم الشحن',
    ready: 'جاهز للاستلام',
    delivered: 'تم التسليم',
    cancelled: 'ملغى',
};

export function OrderCard({ order }: OrderCardProps) {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'cancelled':
                return <XCircle className="w-4 h-4" />;
            case 'delivered':
            case 'ready':
                return <CheckCircle2 className="w-4 h-4" />;
            case 'pending':
                return <Clock className="w-4 h-4" />;
            default:
                return <Package className="w-4 h-4" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'cancelled':
                return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
            case 'delivered':
            case 'ready':
                return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
            case 'pending':
                return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400';
            default:
                return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
        }
    };

    const formattedDate = new Intl.DateTimeFormat('ar-IL', {
        numeralSystem: 'latn',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
    }).format(new Date(order.created_at));

    return (
        <div className="bg-background shadow-neumorph rounded-2xl p-4 md:p-6 flex flex-col gap-3">
            {/* Row 1: Status badge (full width) */}
            <div className={`self-start px-3 py-1.5 rounded-full flex items-center gap-1.5 font-bold text-xs shadow-neumorph-inset ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                <span>{statusLabels[order.status] || order.status}</span>
            </div>

            {/* Row 2: Order number */}
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">طلب رقم</p>
                <p className="font-bold text-base font-mono tracking-wider" dir="ltr">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Row 3: Date & Total — stacked on mobile, side-by-side on larger */}
            <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                    <span className="text-[11px] text-muted-foreground mb-0.5">التاريخ</span>
                    <span className="font-semibold text-[13px] text-foreground" dir="ltr">{formattedDate}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[11px] text-muted-foreground mb-0.5">المجموع</span>
                    <span className="font-black text-base text-foreground" dir="ltr">
                        {order.total_amount.toLocaleString('ar-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0 })}
                    </span>
                </div>
            </div>

            {/* Items Summary */}
            <div className="bg-background shadow-neumorph-inset rounded-xl p-3 mt-1">
                <h4 className="font-bold text-xs mb-2 text-muted-foreground">تفاصيل الطلب:</h4>
                <ul className="flex flex-col gap-1.5">
                    {order.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center text-[13px] gap-2">
                            <span className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className="bg-background shadow-neumorph-sm w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] flex-shrink-0">
                                    {item.quantity}x
                                </span>
                                <span className="truncate">{item.product?.name || 'منتج غير متوفر'}</span>
                            </span>
                            <span className="font-semibold flex-shrink-0 text-[12px]" dir="ltr">
                                {(item.unit_price * item.quantity).toLocaleString('ar-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0 })}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
