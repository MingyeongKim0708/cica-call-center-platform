// server/src/models/Product.js
import * as db from "../config/db.js";

class Product {
  // 상품 ID로 상품 조회
  static async findById(productId) {
    try {
      const result = await db.query(
        "SELECT * FROM products WHERE product_id = $1",
        [productId]
      );
      return result.rows[0];
    } catch (error) {
      console.error("상품 조회 오류:", error);
      throw error;
    }
  }

  // 상품 재고 감소
  static async decreaseStock(productId, quantity) {
    try {
      const result = await db.query(
        `UPDATE products
         SET stock_quantity = stock_quantity - $1
         WHERE product_id = $2 AND stock_quantity >= $1
         RETURNING *`,
        [quantity, productId]
      );

      if (result.rows.length === 0) {
        throw new Error(`상품 ID ${productId}의 재고가 부족합니다.`);
      }

      return result.rows[0];
    } catch (error) {
      console.error("재고 감소 오류:", error);
      throw error;
    }
  }

  // 카테고리별 상품 조회
  static async findByCategory(categoryId) {
    try {
      const result = await db.query(
        "SELECT * FROM products WHERE category_id = $1 AND active = true",
        [categoryId]
      );
      return result.rows;
    } catch (error) {
      console.error("카테고리별 상품 조회 오류:", error);
      throw error;
    }
  }

  // 상품 검색
  static async search(query) {
    try {
      const result = await db.query(
        `SELECT * FROM products 
         WHERE (name ILIKE $1 OR description ILIKE $1) AND active = true
         ORDER BY name`,
        [`%${query}%`]
      );
      return result.rows;
    } catch (error) {
      console.error("상품 검색 오류:", error);
      throw error;
    }
  }
}

export default Product;
