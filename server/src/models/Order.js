// server/src/models/Order.js
import * as db from "../config/db.js";

class Order {
  // 주문 ID로 주문 조회
  static async findById(orderId) {
    try {
      const result = await db.query(
        `SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
         FROM orders o
         JOIN customers c ON o.customer_id = c.customer_id
         WHERE o.order_id = $1`,
        [orderId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("주문 조회 오류:", error);
      throw error;
    }
  }

  // 주문 상품 조회
  static async getOrderItems(orderId) {
    try {
      const result = await db.query(
        `SELECT oi.*, p.name, p.description, p.price, p.returnable, p.return_price, p.exchangable, p.exchange_price
         FROM order_items oi
         JOIN products p ON oi.product_id = p.product_id
         WHERE oi.order_id = $1`,
        [orderId]
      );
      return result.rows;
    } catch (error) {
      console.error("주문 상품 조회 오류:", error);
      throw error;
    }
  }

  // 주문 상품 ID로 상품 조회
  static async getOrderItemById(orderItemId) {
    try {
      const result = await db.query(
        `SELECT oi.*, p.name, p.description, p.price, p.returnable, p.return_price, p.exchangable, p.exchange_price
         FROM order_items oi
         JOIN products p ON oi.product_id = p.product_id
         WHERE oi.order_item_id = $1`,
        [orderItemId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("주문 상품 조회 오류:", error);
      throw error;
    }
  }

  // 주문 상품 상태 업데이트
  static async updateOrderItemStatus(orderItemId, status) {
    try {
      const result = await db.query(
        `UPDATE order_items
         SET status = $1
         WHERE order_item_id = $2
         RETURNING *`,
        [status, orderItemId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("주문 상품 상태 업데이트 오류:", error);
      throw error;
    }
  }

  // 주문 상태 업데이트
  static async updateOrderStatus(orderId, status) {
    try {
      const result = await db.query(
        `UPDATE orders
         SET status = $1
         WHERE order_id = $2
         RETURNING *`,
        [status, orderId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("주문 상태 업데이트 오류:", error);
      throw error;
    }
  }

  // 새 주문 생성 (트랜잭션 사용)
  static async create(orderData, orderItems) {
    return db.transaction(async client => {
      // 1. 주문 생성
      const orderResult = await client.query(
        `INSERT INTO orders (customer_id, order_date, status, total_amount, payment_method)
         VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4)
         RETURNING *`,
        [
          orderData.customer_id,
          orderData.status,
          orderData.total_amount,
          orderData.payment_method,
        ]
      );

      const order = orderResult.rows[0];

      // 2. 주문 상품 생성
      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, subtotal, status)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            order.order_id,
            item.product_id,
            item.quantity,
            item.subtotal,
            item.status,
          ]
        );
      }

      return order;
    });
  }
}

export default Order;
