import { BadRequestException, Injectable } from '@nestjs/common';
import { Dropbox } from 'dropbox';
import * as fetch from 'isomorphic-fetch'; // Đảm bảo rằng fetch được sử dụng trong môi trường Node.js

@Injectable()
export class DropboxService {
  private dropbox: Dropbox;

  constructor() {
    // Khởi tạo Dropbox API với access token của bạn
    const accessToken = process.env.DROPBOX_ACCESS_TOKEN;
    this.dropbox = new Dropbox({ accessToken, fetch });
  }
  async exchangeAuthCodeForTokens(authCode: string): Promise<any> {
    const clientId = process.env.DROPBOX_CLIENT_ID;
    const clientSecret = process.env.DROPBOX_CLIENT_SECRET;
    const redirectUri = process.env.DROPBOX_REDIRECT_URI;
  
    const response = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: authCode,
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });
  
    const data = await response.json();
  
    if (data.access_token && data.refresh_token) {
      console.log('Access Token:', data.access_token);
      console.log('Refresh Token:', data.refresh_token);
  
      return data;
    } else {
      console.error('Error exchanging code for tokens:', data);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }
  
  // Tải lên file vào Dropbox
  async uploadFile(file: Express.Multer.File): Promise<any> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = `/${timestamp}-${file.originalname}`;
      const contents = file.buffer;
      const response = await this.dropbox.filesUpload({
        path: filePath,
        contents: contents,
      });
      return response.result;
    } catch (error) {
      console.error('Error uploading file to Dropbox:', error);
      throw new BadRequestException('Upload failed');
    }
  }
  // Tải lên file vào Dropbox và trả về link tải về
  async uploadFileAndGetLink(file: Express.Multer.File): Promise<string> {
    try {
      const uploadResponse = await this.uploadFile(file);
      const temporaryLink = await this.getTemporaryLink(
        uploadResponse.result.id,
      );
      return temporaryLink;
    } catch (error) {
      console.error(
        'Error uploading file and getting link from Dropbox:',
        error,
      );
      throw new BadRequestException('Upload and get link failed');
    }
  }
  //xóa file
    async deleteFile(filePath: string): Promise<void> {
        try {
            await this.dropbox.filesDeleteV2({
                path: filePath,
            });
            console.log('File deleted from Dropbox:', filePath);
        } catch (error) {
            console.error('Error deleting file from Dropbox:', error);
            throw new BadRequestException('Delete failed');
        }
    }
  // share file
  async shareFile(filePath: string): Promise<any> {
    try {
      const response = await this.dropbox.sharingCreateSharedLink({
        path: filePath,
        short_url: false,
      });
      return response.result.url;
    } catch (error) {
      console.error('Error sharing file on Dropbox:', error);
      throw new BadRequestException('Share failed');
    }
  }

  // Lấy link tạm thời tải xuống file
  async getTemporaryLink(fileId: string): Promise<string> {
    try {
      const response = await this.dropbox.filesGetTemporaryLink({
        path: fileId, // Dùng fileId từ kết quả API
      });

      // Link tạm thời sẽ nằm trong response.link
      return response.result.link; // Đây là link tải xuống trực tiếp
    } catch (error) {
      console.error('Error getting temporary link:', error);
      throw new BadRequestException('Failed to get temporary link');
    }
  }
}
