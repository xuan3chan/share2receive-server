import { Injectable } from '@nestjs/common';
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
      throw new Error('Product not found');
    }
    if (product.type != 'sale') {
        throw new Error('Product not for sale');
    }
    if(product.status != 'active'){
        throw new Error('Product not active');
    }
    if( userId === product.userId){
        throw new Error('You can not buy your product');
    }
   
    const sizeVariant = product.sizeVariants.find(
      (sizeVariant) =>
        sizeVariant.size === createCartDto.size &&
        sizeVariant.colors === createCartDto.color,
    );
    if (!sizeVariant) {
      throw new Error('Size or color not found');
    }
    if (sizeVariant.amount < createCartDto.amount) {
      throw new Error('Not enough product');
    }
    //tạo cart
    const result =product.price * createCartDto.amount;
    const cart = new this.cartModel({
      userId,
      productId: createCartDto.productId,
      size: createCartDto.size,
      color: createCartDto.color,
      amount: createCartDto.amount,
      price: product.price,
      total: result
    });
    await cart.save();
    return cart;
  }
  async deleteCartService(userId: string, cartId: string): Promise<{message:string}> {
    await this.cartModel.deleteOne({ _id: cartId, userId });
    return  {message:'Delete success'};
  }
  async getCartService(userId: string): Promise<{data:Cart[]}> {
    const cart = await this.cartModel.find({ userId }).populate('productId','_id productName imgUrls userId status isDeleted ');
    return {data:cart};
  }
  
}
