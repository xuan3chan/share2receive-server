// import { Injectable, InternalServerErrorException } from '@nestjs/common';
// import { ImageAnnotatorClient } from '@google-cloud/vision';

// @Injectable()
// export class ImageAnalysisService {
//   private client: ImageAnnotatorClient;

//   constructor() {
//     this.client = new ImageAnnotatorClient({
//       keyFilename: './libs/libs/src/common/config/carbide-tenure-435804-g8-44d158b4e0fb.json', // Path to the service account JSON file
//     });
//   }

//   async analyzeImage(file: Express.Multer.File): Promise<any> {
//     try {
//       const [result] = await this.client.labelDetection({
//         image: { content: file.buffer },
//       });
//       const labels = result.labelAnnotations;
//       return labels.map(label => ({
//         description: label.description,
//         score: label.score,
//       }));
//     } catch (error) {
//       console.error('Error analyzing image with Google Vision API:', error);
//       throw new InternalServerErrorException('Failed to analyze image');
//     }
//   }
// }