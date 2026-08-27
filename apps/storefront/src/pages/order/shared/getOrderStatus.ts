interface OrderStatusConfig {
  [k: string]: string;
}

const ORDER_STATUS_TEXT_COLOR = 'rgba(0, 0, 0, 0.87)';

const orderStatusColor: OrderStatusConfig = {
  'Partially Refunded': '#F4CC46',
  'Manual Verification Required': '#DDA3AE',
  Disputed: '#916CF6',
  Refunded: '#F4CC46',
  Declined: '#7A6041',
  Cancelled: '#000000',
  Shipped: '#C4DD6C',
  Completed: '#C4DD6C',
  'Partially Shipped': '#516FAE',
  'Awaiting Pickup': '#BE7FEB',
  'Awaiting Shipment': '#BD3E1E',
  'Awaiting Fulfillment': '#87CBF6',
  'Awaiting Payment': '#F19536',
  Pending: '#899193',
  Incomplete: '#000000',
};

// i18n
const orderStatusText: OrderStatusConfig = {
  'Partially Refunded': 'Partially Refunded',
  'Manual Verification Required': 'Manual Verification Required here',
  Disputed: 'Disputed',
  Refunded: 'Refunded',
  Declined: 'Declined',
  Cancelled: 'Cancelled',
  Shipped: 'Shipped',
  Completed: 'Completed',
  'Partially Shipped': 'Partially Shipped',
  'Awaiting Pickup': 'Awaiting Pickup',
  'Awaiting Shipment': 'Awaiting Shipment',
  'Awaiting Fulfillment': 'Awaiting Fulfillment',
  'Awaiting Payment': 'Awaiting Payment',
  Pending: 'Pending',
  Incomplete: 'Incomplete',
};

export const orderStatusTranslationVariables: OrderStatusConfig = {
  Incomplete: 'orders.status.incomplete',
  Pending: 'orders.status.pending',
  Shipped: 'orders.status.shipped',
  'Partially Shipped': 'orders.status.partiallyShipped',
  Refunded: 'orders.status.refunded',
  Cancelled: 'orders.status.cancelled',
  Declined: 'orders.status.declined',
  'Awaiting Payment': 'orders.status.awaitingPayment',
  'Awaiting Pickup': 'orders.status.awaitingPickup',
  'Awaiting Shipment': 'orders.status.awaitingShipment',
  Completed: 'orders.status.completed',
  'Awaiting Fulfillment': 'orders.status.awaitingFulfillment',
  'Manual Verification Required': 'orders.status.manualVerificationRequired',
  Disputed: 'orders.status.disputed',
  'Partially Refunded': 'orders.status.partiallyRefunded',
};

const getOrderStatus = (code: string | number) => ({
  color: orderStatusColor[code],
  textColor: ORDER_STATUS_TEXT_COLOR,
  name: orderStatusText[code],
});

export default getOrderStatus;
