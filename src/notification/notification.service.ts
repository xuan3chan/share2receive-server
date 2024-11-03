import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from '@app/libs/common/schema/notification.schema';
import { RedisService } from '../redis/redis.service'; // Import RedisService

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
        private redisService: RedisService, // Inject RedisService
    ) {}

    async createNotification(userId: string, title: string, content: string): Promise<Notification> {
        const createdNotification = new this.notificationModel({ userId, title, content });
        const notification = await createdNotification.save();
    
        // Invalidate cache for the user
        await this.redisService.delJSON(`notifications:${userId}`);
        return notification;
    }
    
    async updateNotificationViewed(userId: string, notificationId: string): Promise<Notification> {
        const updatedNotification = await this.notificationModel.findOneAndUpdate(
            { userId, _id: notificationId },
            { isViewed: true },
            { new: true }
        );

        // Invalidate cache for the user
        this.redisService.delJSON(`notifications:${userId}`);
        return updatedNotification;
    }

    async getNotificationByUserId(userId: string): Promise<Notification[]> {
      const cacheKey = `notifications:${userId}`;
    
      // Try getting notifications from Redis
      const cachedNotifications = await this.redisService.getJSON<Notification[]>(cacheKey, '$');
      if (cachedNotifications) {
        this.logger.log(`Cache hit for user ${userId}`);
        return cachedNotifications;
      }
    
      // If not in cache, fetch from the database
      this.logger.log(`Cache miss for user ${userId}. Fetching from DB.`);
      const notifications = await this.notificationModel
        .find({ userId })
        .sort({ createdAt: -1 }) // Sort by createdAt in descending order
        .lean();
    
      // Deep serialization to remove Mongoose-specific properties
      const serializedNotifications = JSON.parse(JSON.stringify(notifications));
    
      // Save the notifications to Redis with a TTL of 1 hour (3600 seconds)
      await this.redisService.setJSON(cacheKey, '$', serializedNotifications);
      return notifications;
    }
    
    
}
