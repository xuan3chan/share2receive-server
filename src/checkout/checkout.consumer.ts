// import { Process, Processor } from '@nestjs/bull';
// import { Job } from 'bull';
// import { Injectable } from '@nestjs/common';
// import { CheckoutService } from 'src/checkout/checkout.service';

// @Processor('checkout')
// @Injectable()
// export class CheckoutProcessor {
//   constructor(private checkoutService: CheckoutService) {}

//   @Process({ concurrency: 3 }) 
//   async handleCheckout(job: Job<any>): Promise<any> { // Thay đổi kiểu trả về thành Promise<any>
//     try {
//       console.log(`Processing job: ${job.id}`, job.data);

//       const { userId, orderID, paymentMethod, pointsToAdd, packetId } = job.data;

//       let result;
//       switch (paymentMethod) {
//         case 'wallet':
//           result = await this.checkoutService.checkoutByWalletService(userId, orderID);
//           break;
//         case 'momo':
//           result = await this.checkoutService.momoPayment(userId, orderID);
//           break;
//         case 'agreement':
//           result = await this.checkoutService.checkoutByAgreementService(userId, orderID);
//           break;
//         case 'momoPoint':
//           result = await this.checkoutService.momoPaymentPoint(userId, pointsToAdd);
//           break;
//         case 'packet':
//           result = await this.checkoutService.checkoutPacketService(userId, packetId);
//           break;
//         default:
//           throw new Error('Invalid payment method');
//       }

//       console.log(`Job ${job.id} completed successfully`, result);

//       return result; // Trả về kết quả từ hàm xử lý
//     } catch (error) {
//       console.error(`Job ${job.id} failed`, error);
//       throw error; // Để Bull xử lý retry nếu cần
//     }
//   }
// }
