// tạo interface shpping với 3 đối tượng là GHN, GHTK, agreement
export interface IShipping {
  name: string;
  intraProvince: {
    mass: number; // kg
    fee: number;
    more: number;
  };
  interProvince: {
    mass: number; // kg
    fee: number;
    more: number;
  };
}

