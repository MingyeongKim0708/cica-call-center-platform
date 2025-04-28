// server/src/models/Customer.js
import * as db from "../config/db.js";

class Customer {
  // 전화번호로 고객 조회
  static async findByPhone(phone) {
    try {
      const result = await db.query(
        "SELECT * FROM customers WHERE phone = $1",
        [phone]
      );
      return result.rows[0];
    } catch (error) {
      console.error("고객 조회 오류:", error);
      throw error;
    }
  }

  // 고객 ID로 고객 조회
  static async findById(customerId) {
    try {
      const result = await db.query(
        "SELECT * FROM customers WHERE customer_id = $1",
        [customerId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("고객 조회 오류:", error);
      throw error;
    }
  }

  // 고객의 주문 목록 조회
  static async getOrders(customerId) {
    try {
      const result = await db.query(
        `SELECT o.order_id, o.order_date, o.status as order_status, o.total_amount, o.payment_method
         FROM orders o
         WHERE o.customer_id = $1
         ORDER BY o.order_date DESC`,
        [customerId]
      );
      return result.rows;
    } catch (error) {
      console.error("고객 주문 조회 오류:", error);
      throw error;
    }
  }

  // 고객의 주문 상품 목록 조회
  static async getOrderItems(customerId) {
    try {
      const result = await db.query(
        `SELECT oi.order_item_id, oi.order_id, oi.quantity, oi.subtotal, oi.status,
                p.product_id, p.name, p.price, p.description, 
                p.returnable, p.return_price, p.exchangable, p.exchange_price,
                o.order_date
         FROM order_items oi
         JOIN products p ON oi.product_id = p.product_id
         JOIN orders o ON oi.order_id = o.order_id
         WHERE o.customer_id = $1
         ORDER BY o.order_date DESC`,
        [customerId]
      );
      return result.rows;
    } catch (error) {
      console.error("고객 주문 상품 조회 오류:", error);
      throw error;
    }
  }

  // 새 고객 생성
  // Customer.js 모델 수정
  static async create(customerData) {
    const { name, phone, address, email } = customerData;

    // 트랜잭션 사용
    return await db.transaction(async (client) => {
      // 중복 확인을 트랜잭션 내에서 수행
      const checkResult = await client.query(
        "SELECT * FROM customers WHERE phone = $1",
        [phone]
      );

      if (checkResult.rows.length > 0) {
        throw new Error("이미 등록된 전화번호입니다.");
      }

      const result = await client.query(
        `INSERT INTO customers (name, phone, address, email, join_date)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
        [name, phone, address, email]
      );
      return result.rows[0];
    });
  }

  // 고객 정보 업데이트
  static async update(customerId, customerData) {
    const { name, phone, address, email } = customerData;

    try {
      const result = await db.query(
        `UPDATE customers
         SET name = $1, phone = $2, address = $3, email = $4
         WHERE customer_id = $5
         RETURNING *`,
        [name, phone, address, email, customerId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("고객 업데이트 오류:", error);
      throw error;
    }
  }

  // 상담 기록 추가
  static async addConsultation(consultationData) {
    const { customer_id, staff_id, summary, note } = consultationData;

    try {
      const result = await db.query(
        `INSERT INTO consultations (customer_id, staff_id, consultation_date, summary, note)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
         RETURNING *`,
        [customer_id, staff_id, summary, note]
      );
      return result.rows[0];
    } catch (error) {
      console.error("상담 기록 추가 오류:", error);
      throw error;
    }
  }

  // 고객의 상담 기록 조회
  static async getConsultations(customerId) {
    try {
      const result = await db.query(
        `SELECT c.consultation_id, c.consultation_date, c.summary, c.note,
                s.staff_id, s.name as staff_name
         FROM consultations c
         JOIN staff s ON c.staff_id = s.staff_id
         WHERE c.customer_id = $1
         ORDER BY c.consultation_date DESC`,
        [customerId]
      );
      return result.rows;
    } catch (error) {
      console.error("상담 기록 조회 오류:", error);
      throw error;
    }
  }
}

export default Customer;
