export interface IMomoPaymentResponse {
    partnerCode?: string;       // Mã đối tác (MoMo cung cấp)
    orderId: string;           // Mã đơn hàng (tự tạo khi gửi yêu cầu)
    requestId: string;         // Mã yêu cầu (tự tạo khi gửi yêu cầu)
    amount: number;            // Số tiền thanh toán
    orderInfo: string;         // Thông tin đơn hàng (được gửi trong payload yêu cầu)
    orderType: string;         // Loại đơn hàng (vd: momo_wallet)
    transId: number;           // Mã giao dịch do MoMo cung cấp
    resultCode: number;        // Mã trạng thái kết quả (0 là thành công)
    message: string;           // Mô tả kết quả (vd: Thành công.)
    payType: string;           // Phương thức thanh toán (vd: qr)
    responseTime: number;      // Thời gian phản hồi (timestamp)
    extraData: string;         // Dữ liệu bổ sung (nếu có)
    signature: string;         // Chữ ký bảo mật của phản hồi
  }
  