// server/src/models/ReturnExchange.js
import * as db from "../config/db.js";

class ReturnExchange {
  // 반품/교환 ID로 조회
  static async findById(returnExchangeId) {
    try {
      const result = await db.query(
        `SELECT re.*, oi.order_id, oi.product_id, oi.quantity, oi.subtotal, oi.status as order_item_status,
                p.name as product_name, p.price as product_price
         FROM return_exchange re
         JOIN order_items oi ON re.order_item_id = oi.order_item_id
         JOIN products p ON oi.product_id = p.product_id
         WHERE re.return_exchange_id = $1`,
        [returnExchangeId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("반품/교환 조회 오류:", error);
      throw error;
    }
  }

  // 주문 상품 ID로 반품/교환 조회
  static async findByOrderItemId(orderItemId) {
    try {
      const result = await db.query(
        `SELECT re.*, oi.order_id, oi.product_id, oi.quantity, oi.subtotal, oi.status as order_item_status,
                p.name as product_name, p.price as product_price
         FROM return_exchange re
         JOIN order_items oi ON re.order_item_id = oi.order_item_id
         JOIN products p ON oi.product_id = p.product_id
         WHERE re.order_item_id = $1`,
        [orderItemId]
      );
      return result.rows;
    } catch (error) {
      console.error("반품/교환 조회 오류:", error);
      throw error;
    }
  }

  // 신규 반품/교환 생성
  static async create(returnExchangeData) {
    const { order_item_id, type, reason, fee_applied } = returnExchangeData;

    return db.transaction(async client => {
      // 1. 반품/교환 생성
      const result = await client.query(
        `INSERT INTO return_exchange (order_item_id, type, reason, request_date, status, fee_applied)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP, '접수', $4)
         RETURNING *`,
        [order_item_id, type, reason, fee_applied]
      );

      const returnExchange = result.rows[0];

      // 2. 주문 상품 상태 업데이트
      await client.query(
        `UPDATE order_items
         SET status = $1
         WHERE order_item_id = $2`,
        [type === 1 ? "교환중" : "반품중", order_item_id]
      );

      return returnExchange;
    });
  }

  // 반품/교환 상태 업데이트
  static async updateStatus(returnExchangeId, status) {
    try {
      const result = await db.query(
        `UPDATE return_exchange
         SET status = $1
         WHERE return_exchange_id = $2
         RETURNING *`,
        [status, returnExchangeId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("반품/교환 상태 업데이트 오류:", error);
      throw error;
    }
  }

  // 고객 ID로 반품/교환 목록 조회
  static async findByCustomerId(customerId) {
    try {
      const result = await db.query(
        `SELECT re.*, oi.order_id, oi.product_id, oi.quantity, oi.subtotal, oi.status as order_item_status,
                p.name as product_name, p.price as product_price, o.customer_id
         FROM return_exchange re
         JOIN order_items oi ON re.order_item_id = oi.order_item_id
         JOIN products p ON oi.product_id = p.product_id
         JOIN orders o ON oi.order_id = o.order_id
         WHERE o.customer_id = $1
         ORDER BY re.request_date DESC`,
        [customerId]
      );
      return result.rows;
    } catch (error) {
      console.error("고객 반품/교환 조회 오류:", error);
      throw error;
    }
  }
}

export default ReturnExchange;
