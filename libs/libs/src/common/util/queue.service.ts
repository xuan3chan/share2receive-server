// import { Injectable } from '@nestjs/common';
// import { InjectQueue } from '@nestjs/bull';
// import { Queue } from 'bull';
// import { CheckoutProcessor } from '../../../../../src/checkout/checkout.consumer'; // Import Processor để xử lý trực tiếp nếu cần

// @Injectable()
// export class QueueService {
//   constructor(
//     @InjectQueue('checkout') private checkoutQueue: Queue,
//     private checkoutProcessor: CheckoutProcessor,
//   ) {}

//   async addToQueueOrProcess(jobData: any): Promise<any> {
//     const jobCounts = await this.checkoutQueue.getJobCounts(); // Lấy trạng thái hàng đợi
//     const maxQueueLength = 10; // Ngưỡng quá tải

//     if (jobCounts.waiting >= maxQueueLength) {
//       // Nếu hàng đợi quá tải, thêm vào hàng đợi
//       console.log(`Queue overloaded (${jobCounts.waiting} jobs). Adding to queue.`);
//       const job = await this.checkoutQueue.add('processCheckout', jobData, {
//         attempts: 3,
//         backoff: 5000,
//         removeOnComplete: true,
//         removeOnFail: true,
//       });

//       return { jobId: job.id, status: 'queued' };
//     } else {
//       // Nếu hàng đợi chưa quá tải, xử lý ngay lập tức
//       console.log(`Processing immediately. Current queue: ${jobCounts.waiting} jobs.`);
//       return await this.checkoutProcessor.handleCheckout({ data: jobData });
//     }
//   }
// }
