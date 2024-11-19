import * as https from 'https';
import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cart, Product } from '@app/libs/common/schema';
import { Model } from 'mongoose';

@Injectable()
export class CheckoutService {
    constructor(
        @InjectModel(Cart.name) private cartModel: Model<Cart>,
        @InjectModel(Product.name) private productModel: Model<Product>,
    ) {}

    // MoMo payment
    async momoPayment(userId: string): Promise<any> {
        // Config MoMo
        const config = {
            accessKey: 'F8BBA842ECF85',
            secretKey: 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
            partnerCode: 'MOMO',
            redirectUrl: 'https://share2receive-client.vercel.app/',
            ipnUrl:process.env.MOMO_IPN_URL,
            requestType: 'payWithMethod',
            lang: 'vi',
        };

        const orderInfo = 'Pay with MoMo 21333';
        const extraData = '';
        const autoCapture = true;

        // Dummy user info (replace with actual user data)
        const userInfo = {
            name: 'Nguyen Van A',
            phongeNumber: '0987654321',
            email: 'x@gmail.com',
        };

        // Giả lập tổng số tiền (có thể thay bằng logic thực tế)
        const amount = '10000';

        // Tạo orderId và requestId duy nhất
        const orderId = config.partnerCode + new Date().getTime();
        const requestId = orderId;
        const items = [{
            id: 'p1',
            name: 'Product 1',
            price: 10000,
            currency: 'VND',
            quantity: 1,
            imageUrl: 'https://share2receive-client.vercel.app/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fdtvhqvucg%2Fimage%2Fupload%2Fv1730749798%2Fshare2receive%2Fimages%2FambabydollhaidayphoinoS2R-1730749797958.jpg&w=640&q=90',
            totalPrice: 10000,
        },
        {
            id: 'p2',
            name: 'Product 2',
            price: 20000,
            currency: 'VND',
            quantity: 1,
            totalPrice: 20000,
        },
    ]
        // Tạo chữ ký (signature)
        const rawSignature = [
            `accessKey=${config.accessKey}`,
            `amount=${amount}`,
            `extraData=${extraData}`,
            `ipnUrl=${config.ipnUrl}`,
            `orderId=${orderId}`,
            `orderInfo=${orderInfo}`,
            `partnerCode=${config.partnerCode}`,
            `redirectUrl=${config.redirectUrl}`,
            `requestId=${requestId}`,
            `requestType=${config.requestType}`,
        ].join('&');

        const signature = crypto
            .createHmac('sha256', config.secretKey)
            .update(rawSignature)
            .digest('hex');

        // JSON gửi đến MoMo
        const requestBody = JSON.stringify({
            partnerCode: config.partnerCode,
            partnerName: 'Share2Receive',
            storeId: 'MomoStore',
            requestId,
            userInfo,
            items,
            amount,
            orderId,
            orderInfo,
            redirectUrl: config.redirectUrl,
            ipnUrl: config.ipnUrl,
            lang: config.lang,
            requestType: config.requestType,
            autoCapture,
            extraData,
            signature,
        });

        // Tạo yêu cầu HTTPS
        const options = {
            hostname: 'test-payment.momo.vn',
            port: 443,
            path: '/v2/gateway/api/create',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestBody),
            },
        };

        // Gửi request đến MoMo
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.resultCode === 0) {
                            resolve({
                              response
                            });
                        } else {
                            reject(new Error(`Lỗi khi tạo thanh toán: ${response.message}`));
                        }
                    } catch (error) {
                        reject(new Error('Không thể phân tích phản hồi từ MoMo.'));
                    }
                });
            });

            req.on('error', (e) => {
                reject(new Error(`Lỗi kết nối đến MoMo: ${e.message}`));
            });

            req.write(requestBody);
            req.end();
        });
    }
}
