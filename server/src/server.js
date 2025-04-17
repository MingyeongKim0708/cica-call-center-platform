// server/src/server.js
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import { testConnection } from "./config/db.js";

// 라우트 임포트
import customerRoutes from "./routes/customers.js";
import orderRoutes from "./routes/orders.js";
import returnRoutes from "./routes/returns.js";

// Express 앱 설정
const app = express();

// 미들웨어
app.use(helmet()); // 보안 헤더 추가
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"], // 배열로 변경
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API 라우트
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/returns", returnRoutes);

// 기본 라우트
app.get("/", (req, res) => {
  res.json({ message: "상담사 플랫폼 API가 실행 중입니다." });
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || "서버 오류가 발생했습니다.",
      status: err.statusCode || 500,
    },
  });
});

// HTTP 서버 생성
const server = createServer(app);

// Socket.io 설정
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"], // 배열로 변경
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// 상태 관리
const consultants = {}; // 상담사 상태 관리
const calls = {}; // 진행 중인 통화 관리

// Socket.io 연결 처리
io.on("connection", socket => {
  console.log("사용자가 연결되었습니다:", socket.id);

  // 상담사 상태 업데이트
  socket.on("consultant-status", ({ consultantId, isAvailable }) => {
    consultants[consultantId] = {
      socketId: socket.id,
      isAvailable,
    };
    console.log("상담사 상태 업데이트:", consultantId, isAvailable);
  });

  // 통화 요청
  socket.on("call-request", ({ phoneNumber }) => {
    console.log("통화 요청 수신:", phoneNumber);

    // 가용 상담사 찾기
    const availableConsultant = findAvailableConsultant();

    if (availableConsultant) {
      const { consultantId, socketId } = availableConsultant;

      // 통화 정보 저장
      calls[phoneNumber] = {
        customerSocketId: socket.id,
        consultantId,
        consultantSocketId: socketId,
        startTime: new Date(),
      };

      // 상담사에게 통화 알림
      io.to(socketId).emit("incoming-call", { phoneNumber });

      console.log("통화 요청 전달:", phoneNumber, "→", consultantId);
    } else {
      // 가용 상담사 없음
      socket.emit("call-failed");
      console.log("가용 상담사 없음:", phoneNumber);
    }
  });

  // 통화 수락
  socket.on("accept-call", ({ phoneNumber, consultantId }) => {
    if (calls[phoneNumber]) {
      // 고객에게 통화 수락 알림
      io.to(calls[phoneNumber].customerSocketId).emit("call-accepted", {
        consultantId,
      });

      // 상담사 상태 업데이트
      if (consultants[consultantId]) {
        consultants[consultantId].isAvailable = false;
      }

      console.log("통화 수락:", phoneNumber, "←", consultantId);
    }
  });

  // 통화 거절
  socket.on("reject-call", ({ phoneNumber }) => {
    if (calls[phoneNumber]) {
      // 고객에게 통화 실패 알림
      io.to(calls[phoneNumber].customerSocketId).emit("call-failed");

      // 통화 정보 삭제
      delete calls[phoneNumber];

      console.log("통화 거절:", phoneNumber);
    }
  });

  // Offer 전달
  socket.on("offer", ({ offer, phoneNumber, consultantId }) => {
    if (calls[phoneNumber]) {
      // 상담사에게 Offer 전달
      io.to(calls[phoneNumber].consultantSocketId).emit("offer", {
        offer,
        phoneNumber,
      });

      console.log("Offer 전달:", phoneNumber, "→", consultantId);
    }
  });

  // Answer 전달
  socket.on("answer", ({ answer, phoneNumber, consultantId }) => {
    if (calls[phoneNumber]) {
      // 고객에게 Answer 전달
      io.to(calls[phoneNumber].customerSocketId).emit("answer", { answer });

      console.log("Answer 전달:", phoneNumber, "←", consultantId);
    }
  });

  // ICE 후보 전달
  socket.on("ice-candidate", ({ candidate, phoneNumber, consultantId }) => {
    if (calls[phoneNumber]) {
      // 상대방에게 ICE 후보 전달
      const targetSocketId =
        socket.id === calls[phoneNumber].customerSocketId
          ? calls[phoneNumber].consultantSocketId
          : calls[phoneNumber].customerSocketId;

      io.to(targetSocketId).emit("ice-candidate", { candidate });

      console.log("ICE 후보 전달:", phoneNumber);
    }
  });

  // 통화 종료
  socket.on("end-call", ({ phoneNumber, consultantId }) => {
    if (calls[phoneNumber]) {
      // 상대방에게 통화 종료 알림
      const customerSocketId = calls[phoneNumber].customerSocketId;
      const consultantSocketId = calls[phoneNumber].consultantSocketId;

      if (socket.id === customerSocketId) {
        io.to(consultantSocketId).emit("call-ended");
      } else {
        io.to(customerSocketId).emit("call-ended");
      }

      // 상담사 상태 업데이트
      if (consultantId && consultants[consultantId]) {
        consultants[consultantId].isAvailable = true;
      }

      // 통화 정보 삭제
      delete calls[phoneNumber];

      console.log("통화 종료:", phoneNumber);
    }
  });

  // 연결 해제
  socket.on("disconnect", () => {
    console.log("사용자 연결 해제:", socket.id);

    // 상담사 연결 해제 처리
    const consultantId = findConsultantBySocketId(socket.id);
    if (consultantId) {
      delete consultants[consultantId];
      console.log("상담사 연결 해제:", consultantId);
    }

    // 고객 연결 해제 처리
    const phoneNumber = findCallBySocketId(socket.id);
    if (phoneNumber) {
      // 상대방에게 통화 종료 알림
      const call = calls[phoneNumber];
      const targetSocketId =
        socket.id === call.customerSocketId
          ? call.consultantSocketId
          : call.customerSocketId;

      io.to(targetSocketId).emit("call-ended");

      // 상담사 상태 업데이트
      if (call.consultantId && consultants[call.consultantId]) {
        consultants[call.consultantId].isAvailable = true;
      }

      // 통화 정보 삭제
      delete calls[phoneNumber];

      console.log("통화 종료 (연결 해제):", phoneNumber);
    }
  });
});

// 유틸리티 함수
// 가용 상담사 찾기
function findAvailableConsultant() {
  for (const consultantId in consultants) {
    if (consultants[consultantId].isAvailable) {
      return {
        consultantId,
        socketId: consultants[consultantId].socketId,
      };
    }
  }
  return null;
}

// 소켓 ID로 상담사 찾기
function findConsultantBySocketId(socketId) {
  for (const consultantId in consultants) {
    if (consultants[consultantId].socketId === socketId) {
      return consultantId;
    }
  }
  return null;
}

// 소켓 ID로 통화 찾기
function findCallBySocketId(socketId) {
  for (const phoneNumber in calls) {
    const call = calls[phoneNumber];
    if (
      call.customerSocketId === socketId ||
      call.consultantSocketId === socketId
    ) {
      return phoneNumber;
    }
  }
  return null;
}

// 서버 시작
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);

  // 데이터베이스 연결 테스트
  await testConnection();
});

export default server; // 테스트를 위한 export
