import { Injectable, BadRequestException } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';
import * as streamifier from 'streamifier';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from '@ffmpeg-installer/ffmpeg';
import * as ffprobePath from '@ffprobe-installer/ffprobe';
import { join } from 'path';
import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  existsSync,
  mkdirSync,
} from 'fs';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    ffmpeg.setFfmpegPath(ffmpegPath.path);
    ffmpeg.setFfprobePath(ffprobePath.path);
  }

  private async uploadFile(
    file: Express.Multer.File,
    options: object,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  private validateFile(
    file: Express.Multer.File,
    type: 'image' | 'video',
    maxSizeMB: number = 500,
    high: number = 1024,
    width: number = 1024,
  ): void {
    if (!file.mimetype.startsWith(type + '/')) {
      throw new BadRequestException(`File is not a ${type}.`);
    }

    if (type === 'image') {
      const allowedImageExtensions = [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'bmp',
        'webp',
      ];
      const fileExtension = file.originalname.split('.').pop().toLowerCase();
      if (!allowedImageExtensions.includes(fileExtension)) {
        throw new BadRequestException(
          `File extension .${fileExtension} is not allowed for images.`,
        );
      }
    }

    const fileSizeInMB = file.size / (high * width);
    if (fileSizeInMB > maxSizeMB) {
      throw new BadRequestException(
        `File size exceeds the ${maxSizeMB}MB limit.`,
      );
    }
  }

    async uploadImageService(
    imageName: string,
    files: Express.Multer.File | Express.Multer.File[],
    height?: number,
    width?: number,
  ): Promise<{
    uploadResults: (UploadApiResponse | UploadApiErrorResponse)[];
  }> {
    const normalizeName = (name: string) =>
      name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 25);
  
    const uploadSingleFile = async (
      file: Express.Multer.File,
      imageName: string,
    ) => {
      this.validateFile(file, 'image');
      const newImageName = normalizeName(imageName);
      const timestamp = new Date().getTime(); // Tạo timestamp mới cho mỗi file
      const publicId = `share2receive/images/${newImageName}-${timestamp}`;
  
      // Cấu hình transform ảnh nếu có
      const uploadOptions: any = {
        public_id: publicId,
      };
  
      if (height && width) {
        uploadOptions.transformation = {
          height: height,
          width: width,
          crop: 'fit', // Điều chỉnh tỷ lệ ảnh, crop có thể thay đổi thành 'scale' hay 'fill'
        };
      }
  
      return this.uploadFile(file, uploadOptions);
    };
  
    try {
      let uploadResults: (UploadApiResponse | UploadApiErrorResponse)[] = [];
      if (Array.isArray(files)) {
        // Upload nhiều file
        uploadResults = await Promise.all(
          files.map((file) => uploadSingleFile(file, imageName)),
        );
      } else {
        // Upload một file
        const uploadResult = await uploadSingleFile(files, imageName);
        uploadResults.push(uploadResult);
      }
  
      return { uploadResults };
    } catch (error) {
      throw new BadRequestException(error.message || 'Failed to upload images');
    }
  }

  async uploadVideoService(
    videoName: string,
    file: Express.Multer.File,
  ): Promise<{
    uploadResult: UploadApiResponse | UploadApiErrorResponse;
    thumbnailResult: UploadApiResponse | UploadApiErrorResponse;
  }> {
    this.validateFile(file, 'video');
    const publicId = `share2receive/videos/${videoName}`;
    const uploadResult = await this.uploadFile(file, {
      public_id: publicId,
      resource_type: 'video',
    });

    // Extract the first frame
    const thumbnailPath = await this.extractFirstFrame(file);

    // Read the thumbnail file into a buffer
    const thumbnailBuffer = readFileSync(thumbnailPath);
    const thumbnailPublicId = `share2receive/videos/thumbnails/${videoName}`;
    const thumbnailResult = await this.uploadFile(
      { buffer: thumbnailBuffer, mimetype: 'image/png' } as Express.Multer.File,
      { public_id: thumbnailPublicId, resource_type: 'image' },
    );

    // Clean up the temporary thumbnail file
    unlinkSync(thumbnailPath);

    return { uploadResult, thumbnailResult };
  }

  private extractFirstFrame(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const tmpDir = join(__dirname, 'tmp');
      if (!existsSync(tmpDir)) {
        mkdirSync(tmpDir);
      }
      const thumbnailPath = join(tmpDir, `${file.originalname}-thumbnail.png`);

      // Save the buffer to a temporary file
      const tempVideoPath = join(tmpDir, `${file.originalname}`);
      writeFileSync(tempVideoPath, file.buffer);

      ffmpeg(tempVideoPath)
        .on('end', () => {
          console.log('Thumbnail extraction completed:', thumbnailPath);
          unlinkSync(tempVideoPath); // Clean up the temporary video file
          resolve(thumbnailPath);
        })
        .on('error', (err) => {
          console.error('ffmpeg error:', err);
          unlinkSync(tempVideoPath); // Clean up the temporary video file on error
          reject(new BadRequestException('Failed to extract thumbnail'));
        })
        .screenshots({
          timestamps: ['00:00:01.000'],
          folder: tmpDir,
          filename: `${file.originalname}-thumbnail.png`,
        });
    });
  }

  async deleteMediaService(
    url: string,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    // Trích xuất publicId từ URL Cloudinary, bỏ qua phần phiên bản (vd: v1727865186)
    try {
      const publicId = url
        .split('/upload/')[1]
        .split('.')[0]
        .split('/')
        .slice(1)
        .join('/');

      return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
          if (error) {
            console.error(`Failed to delete ${publicId}:`, error); // Log lỗi nếu xảy ra
            reject(error);
          } else {
            console.log(`Deleted ${publicId}:`, result); // Log kết quả nếu thành công
            resolve(result);
          }
        });
      });
    } catch (error) {}
  }

  async deleteManyImagesService(urls: string[]): Promise<void> {
    // Sử dụng await và Promise.all để xóa tất cả các hình ảnh cùng một lúc
    await Promise.all(
      urls.map(async (url) => {
        try {
          // Trích xuất publicId và xóa hình ảnh từ Cloudinary
          const result = await this.deleteMediaService(url);
          return result;
        } catch (error) {
          console.error(`Failed to delete image from URL ${url}`, error);
          return null; // Trả về null nếu không xóa được ảnh
        }
      }),
    );
  }
}
