// server/src/config/db.js
import pg from "pg";
const { Pool } = pg;

// 환경변수에서 PostgreSQL 연결 정보 가져오기
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

// 연결 테스트 함수
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("PostgreSQL 데이터베이스 연결 성공");
    client.release();
    return true;
  } catch (err) {
    console.error("PostgreSQL 데이터베이스 연결 오류:", err);
    return false;
  }
};

// 쿼리 실행 함수 (재사용 목적)
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("실행된 쿼리:", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error("쿼리 실행 오류:", error);
    throw error;
  }
};

// 트랜잭션 실행 함수
export const transaction = async callback => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export default {
  pool,
  query,
  transaction,
  testConnection,
};
