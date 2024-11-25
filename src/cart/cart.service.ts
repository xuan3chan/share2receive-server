import { BadRequestException, Injectable } from '@nestjs/common';
import { Cart, Product } from '@app/libs/common/schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateCartDto } from '@app/libs/common/dto/cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async createCartService(
    userId: string,
    createCartDto: CreateCartDto,
  ): Promise<Cart> {
    const product = await this.productModel.findById(createCartDto.productId);
  
    if (!product) {
      throw new BadRequestException('Product not found');
    }
    if (product.type !== 'sale') {
      throw new BadRequestException('Product not for sale');
    }
    if (product.status !== 'active') {
      throw new BadRequestException('Product not active');
    }
    if (userId === product.userId) {
      throw new BadRequestException('You cannot buy your own product');
    }
  
    const sizeVariant = product.sizeVariants.find(
      (variant) =>
        variant.size === createCartDto.size &&
        variant.colors === createCartDto.color,
    );
    if (!sizeVariant) {
      throw new BadRequestException('Size or color not found');
    }
    if (sizeVariant.amount < createCartDto.amount) {
      throw new BadRequestException('Not enough product');
    }
  
    // Kiểm tra sản phẩm có cùng loại (size, color) đã tồn tại trong giỏ hàng chưa
    const existingCart = await this.cartModel.findOne({
      userId,
      productId: createCartDto.productId,
      size: createCartDto.size,
      color: createCartDto.color,
    });
  
    if (existingCart) {
      // Nếu tồn tại, cộng dồn số lượng và cập nhật tổng giá
      const newAmount = existingCart.amount + createCartDto.amount;
  
      if (sizeVariant.amount < newAmount) {
        throw new BadRequestException('Not enough product to add to cart');
      }
  
      existingCart.amount = newAmount;
      existingCart.total = existingCart.price * newAmount;
      await existingCart.save();
      return existingCart;
    } else {
      // Nếu không tồn tại, tạo mục giỏ hàng mới
      const result = product.price * createCartDto.amount;
      const cart = new this.cartModel({
        userId,
        productId: createCartDto.productId,
        size: createCartDto.size,
        color: createCartDto.color,
        amount: createCartDto.amount,
        price: product.price,
        total: result,
      });
      await cart.save();
      return cart;
    }
  }
  
  async deleteCartService(userId: string, cartId: string): Promise<{message:string}> {
    await this.cartModel.deleteOne({ _id: cartId, userId });
    return  {message:'Delete success'};
  }
  async getCartService(userId: string): Promise<{ data: Cart[], summary: { totalAmount: number, totalTypes: number, totalPrice: number } }> {
    const cart = await this.cartModel.find({ userId }).populate('productId', '_id productName imgUrls userId status isDeleted');
    
    // Tổng số lượng sản phẩm
    const totalAmount = cart.reduce((sum, item) => sum + item.amount, 0);
    
    // Tổng số loại sản phẩm duy nhất
    const uniqueProductIds = new Set(cart.map(item => (item.productId as any)._id.toString()));
    const totalTypes = uniqueProductIds.size;
  
    // Tổng tiền
    const totalPrice = cart.reduce((sum, item) => sum + item.total, 0);
  
    return { data: cart, summary: { totalAmount, totalTypes, totalPrice } };
  }
  
  async updateCartService(userId: string, cartId:string, amount:number): Promise<{message:string}> {
    const cart = await this.cartModel.findOne({ _id: cartId, userId });
    if (!cart) {
      throw new BadRequestException('Cart not found');
    }
    const product = await this.productModel.findById(cart.productId);
    if (!product) {
      throw new BadRequestException('Product not found');
    }
    const sizeVariant = product.sizeVariants.find(
      (sizeVariant) =>
        sizeVariant.size === cart.size &&
        sizeVariant.colors === cart.color,
    );
    if (!sizeVariant) {
      throw new BadRequestException('Size or color not found');
    }
    if (sizeVariant.amount < amount) {
      throw new BadRequestException('Not enough product');
    }
    const result =product.price * amount;
    await this.cartModel.updateOne({ _id: cartId, userId }, { amount: amount, total: result });
    return {message:'Update success'};
  }
}
